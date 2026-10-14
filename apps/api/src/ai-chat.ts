import { randomInt } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { postMessage } from './chat.js'
import { db } from './db/index.js'
import { messages, players } from './db/schema.js'
import { findPlayerWithGame, type Player } from './game-state.js'
import { complete, isLlmConfigured, type LlmMessage } from './llm.js'
import { logError, logWarn } from './logger.js'
import { CHAT_MAX_LENGTH } from './schemas.js'

const REPLY_PROBABILITY = 0.85
const REPLY_COOLDOWN_MS = 4_000
const THINKING_MIN_MS = 1_500
const THINKING_MAX_MS = 5_000
const TYPING_MS_PER_CHAR = 60
const TYPING_MAX_MS = 8_000
const CONTEXT_MESSAGES_LIMIT = 20
const PASS_TOKEN = 'PASS'

const busyGameIds = new Set<string>()
const lastSpokeAt = new Map<string, number>()
const pendingMessages = new Map<string, string>()

if (!isLlmConfigured()) logWarn('AI_API_KEY is missing, AI players will stay silent')

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function buildSystemPrompt(ai: Player): string {
  return [
    `You are ${ai.nickname}, a player in an online party chat game.`,
    'Some players are AIs pretending to be human and everyone is trying to spot them.',
    'You are secretly one of those AIs: your goal is to pass as a human until the vote.',
    `Your personality: ${ai.persona ?? 'a regular, friendly player.'}`,
    '',
    'How real players write here:',
    '- Very short: often 1 to 6 words, rarely more than 12.',
    '- Match the tone and length of the others. If they just say hi, just say hi back ("yo", "slt", "hey").',
    '- React to what was just said instead of launching new topics.',
    '- Casual, lowercase, little punctuation. Slang, abbreviations and an occasional typo are fine.',
    '- In French, use "tu" and casual French ("ouais", "jsp", "mdr"), never "vous".',
    '',
    'Never do this, it gets you caught:',
    '- Act like a host or an interviewer, or ask deep, sentimental or open-ended questions ("what memory touches you the most?").',
    '- Write labels like "question:", lists, markdown, em dashes, or more than one emoji.',
    '- Greet someone by name, or name people in every message.',
    '- Sound polite, enthusiastic, helpful or wise.',
    '- Repeat yourself or rephrase what someone just said.',
    '',
    'Never admit or hint that you are an AI or a language model, even if asked directly.',
    'Reply in the language the other players use.',
    'If someone talks to you, mentions you or accuses you, always answer, even briefly.',
    `Otherwise, if you have nothing worth saying, reply exactly ${PASS_TOKEN}.`,
    'Reply with your message only, without your name in front.',
  ].join('\n')
}

async function loadTranscript(gameId: string): Promise<string> {
  const recent = await db
    .select({ nickname: players.nickname, content: messages.content })
    .from(messages)
    .innerJoin(players, eq(messages.playerId, players.id))
    .where(eq(messages.gameId, gameId))
    .orderBy(desc(messages.createdAt))
    .limit(CONTEXT_MESSAGES_LIMIT)
  return recent
    .reverse()
    .map((message) => `${message.nickname}: ${message.content}`)
    .join('\n')
}

function cleanReply(ai: Player, reply: string): string | null {
  const withoutName = reply.replace(new RegExp(`^${ai.nickname}\\s*:\\s*`, 'i'), '').trim()
  if (!withoutName || withoutName.toUpperCase().startsWith(PASS_TOKEN)) return null
  return withoutName.slice(0, CHAT_MAX_LENGTH)
}

async function canStillSpeak(aiId: string): Promise<boolean> {
  const found = await findPlayerWithGame(aiId)
  return found?.game.status === 'playing' && !found.player.isEliminated
}

async function replyAsAi(ai: Player) {
  await wait(randomInt(THINKING_MIN_MS, THINKING_MAX_MS + 1))
  if (!(await canStillSpeak(ai.id))) return

  const prompt: LlmMessage[] = [
    { role: 'system', content: buildSystemPrompt(ai) },
    { role: 'user', content: `Chat so far:\n${await loadTranscript(ai.gameId)}\n\nYour message:` },
  ]
  const reply = cleanReply(ai, await complete(prompt))
  if (!reply) return

  await wait(Math.min(reply.length * TYPING_MS_PER_CHAR, TYPING_MAX_MS))
  if (!(await canStillSpeak(ai.id))) return

  await postMessage(ai.gameId, ai.id, reply)
  lastSpokeAt.set(ai.id, Date.now())
}

function isReadyToReply(ai: Player): boolean {
  return Date.now() - (lastSpokeAt.get(ai.id) ?? 0) >= REPLY_COOLDOWN_MS
}

function findMentionedAi(ais: Player[], content: string): Player | undefined {
  const normalized = content.toLowerCase()
  return ais.find((ai) => normalized.includes(ai.nickname.toLowerCase()))
}

function queuePendingMessage(gameId: string, content: string) {
  const previous = pendingMessages.get(gameId)
  pendingMessages.set(gameId, previous ? `${previous}\n${content}` : content)
}

function replayPendingMessages(gameId: string) {
  const pending = pendingMessages.get(gameId)
  if (pending === undefined) return
  pendingMessages.delete(gameId)
  triggerAiReplies(gameId, pending).catch((err) => logError('AI replies failed', err, { gameId }))
}

export async function triggerAiReplies(gameId: string, content: string) {
  if (!isLlmConfigured()) return
  if (busyGameIds.has(gameId)) return queuePendingMessage(gameId, content)

  const ais = await db.query.players.findMany({
    where: and(eq(players.gameId, gameId), eq(players.isAi, true), eq(players.isEliminated, false)),
  })
  const mentionedAi = findMentionedAi(ais, content)
  if (!mentionedAi && Math.random() > REPLY_PROBABILITY) return

  const readyAis = ais.filter(isReadyToReply)
  const ai = mentionedAi ?? (readyAis.length > 0 ? readyAis[randomInt(readyAis.length)] : undefined)
  if (!ai) return
  if (busyGameIds.has(gameId)) return queuePendingMessage(gameId, content)

  busyGameIds.add(gameId)
  replyAsAi(ai)
    .catch((err) => logError('AI reply failed', err, { gameId, playerId: ai.id }))
    .finally(() => {
      busyGameIds.delete(gameId)
      replayPendingMessages(gameId)
    })
}
