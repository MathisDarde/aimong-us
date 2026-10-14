import { randomInt } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from './db/index.js'
import { games, players } from './db/schema.js'
import type { Game } from './game-state.js'
import { TURN_DURATION_MS, VOTE_DURATION_MS } from './rules.js'
import { pickTheme } from './themes.js'

const deadlineIn = (durationMs: number) => sql`now() + ${durationMs} * interval '1 millisecond'`

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = randomInt(index + 1)
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

export const voteDeadline = deadlineIn(VOTE_DURATION_MS)

export async function beginRound(game: Game): Promise<Game | undefined> {
  const active = await db.query.players.findMany({
    where: and(eq(players.gameId, game.id), eq(players.isEliminated, false)),
  })
  const [updated] = await db
    .update(games)
    .set({
      turnOrder: shuffle(active.map((player) => player.id)),
      turnIndex: 0,
      turnDeadline: deadlineIn(TURN_DURATION_MS),
      theme: pickTheme(game.theme),
    })
    .where(and(eq(games.id, game.id), eq(games.status, 'playing')))
    .returning()
  return updated
}

export async function advanceTurn(gameId: string, playerId: string): Promise<Game | undefined> {
  const roundOver = sql`${games.turnIndex} + 1 >= jsonb_array_length(${games.turnOrder})`
  const [advanced] = await db
    .update(games)
    .set({
      turnIndex: sql`${games.turnIndex} + 1`,
      status: sql`case when ${roundOver} then 'voting'::game_status else ${games.status} end`,
      turnDeadline: sql`case when ${roundOver} then ${voteDeadline} else ${deadlineIn(TURN_DURATION_MS)} end`,
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
