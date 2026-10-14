import { randomInt } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from './db/index.js'
import { games, players, votes } from './db/schema.js'
import type { Game } from './game-state.js'
import { RESULTS_DURATION_MS, decideWinner, pickEliminated } from './rules.js'
import { beginRound } from './turns.js'

async function activePlayers(gameId: string) {
  return db.query.players.findMany({
    where: and(eq(players.gameId, gameId), eq(players.isEliminated, false)),
  })
}

export async function everyoneVoted(game: Game): Promise<boolean> {
  const [active, cast] = await Promise.all([
    activePlayers(game.id),
    db
      .select({ voterId: votes.voterId })
      .from(votes)
      .where(and(eq(votes.gameId, game.id), eq(votes.round, game.round))),
  ])
  return active.every((player) => cast.some((vote) => vote.voterId === player.id))
}

export async function castAiVote(gameId: string, round: number, aiId: string): Promise<boolean> {
  const game = await db.query.games.findFirst({ where: eq(games.id, gameId) })
  if (!game || game.status !== 'voting' || game.round !== round) return false

  const humans = (await activePlayers(gameId)).filter((player) => !player.isAi)
  if (humans.length === 0) return false

  const target = humans[randomInt(humans.length)]
  const [vote] = await db
    .insert(votes)
    .values({ gameId, round, voterId: aiId, targetId: target.id })
    .onConflictDoNothing()
    .returning({ id: votes.id })
  return vote !== undefined
}

export async function resolveVoting(gameId: string, round: number): Promise<Game | undefined> {
  const [claimed] = await db
    .update(games)
    .set({
      status: 'results',
      lastEliminatedId: null,
      turnDeadline: sql`now() + ${RESULTS_DURATION_MS} * interval '1 millisecond'`,
    })
    .where(and(eq(games.id, gameId), eq(games.status, 'voting'), eq(games.round, round)))
    .returning()
  if (!claimed) return undefined

  const cast = await db
    .select({ targetId: votes.targetId })
    .from(votes)
    .where(and(eq(votes.gameId, gameId), eq(votes.round, round)))
  const eliminatedId = pickEliminated(cast.map((vote) => vote.targetId))
  if (!eliminatedId) return claimed

  await db.update(players).set({ isEliminated: true }).where(eq(players.id, eliminatedId))
  const [withResult] = await db
    .update(games)
    .set({ lastEliminatedId: eliminatedId })
    .where(eq(games.id, gameId))
    .returning()
  return withResult
}

export async function advanceFromResults(game: Game): Promise<Game | undefined> {
  const alive = await activePlayers(game.id)
  const aliveAis = alive.filter((player) => player.isAi).length
  const winner = decideWinner({
    aliveAis,
    aliveHumans: alive.length - aliveAis,
    round: game.round,
  })

  if (winner) {
    const [finished] = await db
      .update(games)
      .set({ status: 'finished', winner, turnDeadline: null })
      .where(and(eq(games.id, game.id), eq(games.status, 'results')))
      .returning()
    return finished
  }

  const [next] = await db
    .update(games)
    .set({ status: 'playing', round: sql`${games.round} + 1`, lastEliminatedId: null })
    .where(and(eq(games.id, game.id), eq(games.status, 'results')))
    .returning()
  return next ? beginRound(next) : undefined
}
