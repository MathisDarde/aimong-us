import { randomInt } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from './db/index.js'
import { games, players } from './db/schema.js'
import { currentTurnPlayerId, loadGameState, type Game } from './game-state.js'
import { logError } from './logger.js'
import { broadcast } from './rooms.js'

export const TURN_DURATION_MS = 30_000
const AI_TURN_MIN_DELAY_MS = 2_000
const AI_TURN_MAX_DELAY_MS = 8_000

const turnTimers = new Map<string, ReturnType<typeof setTimeout>>()

const deadlineFromNow = sql`now() + ${TURN_DURATION_MS} * interval '1 millisecond'`

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = randomInt(index + 1)
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

export function clearTurnTimer(gameId: string) {
  clearTimeout(turnTimers.get(gameId))
  turnTimers.delete(gameId)
}

export async function beginRound(game: Game): Promise<Game | undefined> {
  const active = await db.query.players.findMany({
    where: and(eq(players.gameId, game.id), eq(players.isEliminated, false)),
  })
  const [updated] = await db
    .update(games)
    .set({ turnOrder: shuffle(active.map((player) => player.id)), turnIndex: 0, turnDeadline: deadlineFromNow })
    .where(and(eq(games.id, game.id), eq(games.status, 'playing')))
    .returning()
  if (updated) await scheduleTurn(updated)
  return updated
}

export async function advanceTurn(gameId: string, playerId: string): Promise<Game | undefined> {
  const roundOver = sql`${games.turnIndex} + 1 >= jsonb_array_length(${games.turnOrder})`
  const [advanced] = await db
    .update(games)
    .set({
      turnIndex: sql`${games.turnIndex} + 1`,
      status: sql`case when ${roundOver} then 'voting'::game_status else ${games.status} end`,
      turnDeadline: sql`case when ${roundOver} then null else ${deadlineFromNow} end`,
    })
    .where(
      and(
        eq(games.id, gameId),
        eq(games.status, 'playing'),
        sql`${games.turnOrder} ->> ${games.turnIndex} = ${playerId}`,
      ),
    )
    .returning()
  return advanced
}

export async function publishTurnChange(game: Game) {
  broadcast(game.id, { type: 'game_state', state: await loadGameState(game) })
  await scheduleTurn(game)
}

async function passTurn(gameId: string, playerId: string) {
  const advanced = await advanceTurn(gameId, playerId)
  if (advanced) await publishTurnChange(advanced)
}

export async function scheduleTurn(game: Game) {
  clearTurnTimer(game.id)
  const playerId = currentTurnPlayerId(game)
  if (!playerId) return

  const remainingMs = game.turnDeadline
    ? Math.max(0, game.turnDeadline.getTime() - Date.now())
    : TURN_DURATION_MS
  const speaker = await db.query.players.findFirst({ where: eq(players.id, playerId) })

  let delayMs = remainingMs
  if (speaker?.isAi) {
    delayMs = Math.min(remainingMs, randomInt(AI_TURN_MIN_DELAY_MS, AI_TURN_MAX_DELAY_MS + 1))
    broadcast(game.id, { type: 'typing', playerId })
  }

  turnTimers.set(
    game.id,
    setTimeout(() => {
      passTurn(game.id, playerId).catch((err) => logError('turn timeout failed', err, { gameId: game.id }))
    }, delayMs),
  )
}

export async function ensureTurnTimer(game: Game) {
  if (game.status === 'playing' && !turnTimers.has(game.id)) await scheduleTurn(game)
}
