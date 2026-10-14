import { randomInt } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { postMessage } from './chat.js'
import { db } from './db/index.js'
import { messages, players } from './db/schema.js'
import { findPlayerWithGame, type Player } from './game-state.js'
import { complete, isLlmConfigured, type LlmMessage } from './llm.js'
import { logError, logWarn } from './logger.js'
import { CHAT_MAX_LENGTH } from './schemas.js'

const REPLY_PROBABILITY = 0.6
const REPLY_COOLDOWN_MS = 8_000
const THINKING_MIN_MS = 1_500
const THINKING_MAX_MS = 5_000
const TYPING_MS_PER_CHAR = 60
const TYPING_MAX_MS = 8_000
const CONTEXT_MESSAGES_LIMIT = 20
const PASS_TOKEN = 'PASS'

const busyGameIds = new Set<string>()
const lastSpokeAt = new Map<string, number>()

if (!isLlmConfigured()) logWarn('AI_BASE_URL or AI_API_KEY is missing, AI players will stay silent')

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function buildSystemPrompt(ai: Player): string {
  return [
    `You are ${ai.nickname}, a player in an online party chat game.`,
    'Some players are AIs pretending to be human and everyone is trying to spot them.',
    'You are secretly one of those AIs: your goal is to pass as a human until the vote.',
    `Your personality: ${ai.persona ?? 'a regular, friendly player.'}`,
    'Write like a real person typing fast in a group chat: short (usually under 15 words), casual, lowercase is fine, an occasional typo is fine.',
    'No lists, no markdown, no em dashes, at most one emoji.',
    'Never admit or hint that you are an AI or a language model, even if asked directly.',
    'Reply in the language the other players use.',
    `If you have nothing worth saying, reply exactly ${PASS_TOKEN}.`,
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

export async function triggerAiReplies(gameId: string) {
  if (!isLlmConfigured() || busyGameIds.has(gameId) || Math.random() > REPLY_PROBABILITY) return

  const ais = await db.query.players.findMany({
    where: and(eq(players.gameId, gameId), eq(players.isAi, true), eq(players.isEliminated, false)),
  })
  const readyAis = ais.filter(isReadyToReply)
  if (readyAis.length === 0 || busyGameIds.has(gameId)) return

  const ai = readyAis[randomInt(readyAis.length)]
  busyGameIds.add(gameId)
  replyAsAi(ai)
    .catch((err) => logError('AI reply failed', err, { gameId, playerId: ai.id }))
    .finally(() => busyGameIds.delete(gameId))
}
