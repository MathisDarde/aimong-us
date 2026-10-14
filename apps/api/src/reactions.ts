import { randomInt } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from './db/index.js'
import { messages, players, reactions } from './db/schema.js'
import type { Game } from './game-state.js'
import { logError } from './logger.js'
import { broadcast } from './rooms.js'

export const REACTION_EMOJIS = ['👍', '😂', '😮', '🤔', '🤖'] as const

export type MessageReaction = { emoji: string; playerIds: string[] }

const AI_REACTION_CHANCE_PERCENT = 40
const AI_REACTION_MIN_DELAY_MS = 1_500
const AI_REACTION_MAX_DELAY_MS = 6_000
const PERCENT = 100

async function messageBelongsToGame(gameId: string, messageId: string) {
  const found = await db.query.messages.findFirst({
    where: and(eq(messages.id, messageId), eq(messages.gameId, gameId)),
    columns: { id: true },
  })
  return found !== undefined
}

async function addReaction(gameId: string, messageId: string, playerId: string, emoji: string) {
  const [inserted] = await db
    .insert(reactions)
    .values({ messageId, playerId, emoji })
    .onConflictDoNothing()
    .returning({ id: reactions.id })
  if (inserted) broadcast(gameId, { type: 'reaction', messageId, playerId, emoji, active: true })
}

export async function toggleReaction(
  gameId: string,
  messageId: string,
  playerId: string,
  emoji: string,
): Promise<'ok' | 'message_not_found'> {
  if (!(await messageBelongsToGame(gameId, messageId))) return 'message_not_found'

  const [inserted] = await db
    .insert(reactions)
    .values({ messageId, playerId, emoji })
    .onConflictDoNothing()
    .returning({ id: reactions.id })
  if (!inserted) {
    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.messageId, messageId),
          eq(reactions.playerId, playerId),
          eq(reactions.emoji, emoji),
        ),
      )
  }
  broadcast(gameId, { type: 'reaction', messageId, playerId, emoji, active: Boolean(inserted) })
  return 'ok'
}

export async function scheduleAiReactions(game: Game, message: { id: string; playerId: string }) {
  const ais = await db.query.players.findMany({
    where: and(
      eq(players.gameId, game.id),
      eq(players.isAi, true),
      eq(players.isEliminated, false),
    ),
  })

  for (const ai of ais) {
    if (ai.id === message.playerId || randomInt(PERCENT) >= AI_REACTION_CHANCE_PERCENT) continue

    const emoji = REACTION_EMOJIS[randomInt(REACTION_EMOJIS.length)]
    const delayMs = randomInt(AI_REACTION_MIN_DELAY_MS, AI_REACTION_MAX_DELAY_MS + 1)
    setTimeout(() => {
      addReaction(game.id, message.id, ai.id, emoji).catch((err) =>
        logError('AI reaction failed', err, { gameId: game.id }),
      )
    }, delayMs)
  }
}

export async function loadReactionsByMessage(messageIds: string[]) {
  const byMessage = new Map<string, MessageReaction[]>()
  if (messageIds.length === 0) return byMessage

  const rows = await db
    .select({ messageId: reactions.messageId, playerId: reactions.playerId, emoji: reactions.emoji })
    .from(reactions)
    .where(inArray(reactions.messageId, messageIds))

  for (const { messageId, playerId, emoji } of rows) {
    const list = byMessage.get(messageId) ?? []
    const entry = list.find((reaction) => reaction.emoji === emoji)
    if (entry) entry.playerIds.push(playerId)
    else list.push({ emoji, playerIds: [playerId] })
    byMessage.set(messageId, list)
  }
  return byMessage
}
