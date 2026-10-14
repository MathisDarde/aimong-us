import { randomInt } from 'node:crypto'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { setTimeout as sleep } from 'node:timers/promises'
import { requestAiReply, typingDelayMs } from './ai-replies.js'
import { postMessage } from './chat.js'
import { db } from './db/index.js'
import { messages, players } from './db/schema.js'
import { findGameById, type Game } from './game-state.js'
import { broadcast } from './rooms.js'

const AI_LOBBY_REPLY_CHANCE_PERCENT = 55
const AI_LOBBY_MAX_MESSAGES = 6
const AI_LOBBY_READ_MIN_MS = 1_500
const AI_LOBBY_READ_MAX_MS = 4_000
const PERCENT = 100

const pendingReplies = new Set<string>()

async function lobbyAis(gameId: string) {
  return db.query.players.findMany({
    where: and(eq(players.gameId, gameId), eq(players.isAi, true)),
  })
}

async function aiMessageCount(gameId: string, aiIds: string[]) {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(messages)
    .where(and(eq(messages.gameId, gameId), inArray(messages.playerId, aiIds)))
  return Number(row.total)
}

export async function scheduleAiLobbyReply(game: Game): Promise<void> {
  if (pendingReplies.has(game.id) || randomInt(PERCENT) >= AI_LOBBY_REPLY_CHANCE_PERCENT) return

  const ais = await lobbyAis(game.id)
  if (ais.length === 0 || (await aiMessageCount(game.id, ais.map((ai) => ai.id))) >= AI_LOBBY_MAX_MESSAGES) {
    return
  }

  const ai = ais[randomInt(ais.length)]
  pendingReplies.add(game.id)
  try {
    await sleep(randomInt(AI_LOBBY_READ_MIN_MS, AI_LOBBY_READ_MAX_MS + 1))
    broadcast(game.id, { type: 'typing', playerId: ai.id })
    const reply = await requestAiReply(game, ai, 'lobby')
    if (!reply) return

    await sleep(typingDelayMs(reply))
    const current = await findGameById(game.id)
    if (current?.status === 'lobby') await postMessage(current, ai, reply)
  } finally {
    pendingReplies.delete(game.id)
  }
}
