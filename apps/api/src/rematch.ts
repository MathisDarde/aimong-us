import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from './db/index.js'
import { games, players } from './db/schema.js'
import { findGameById, generateGameCode, loadGameState, type Game } from './game-state.js'
import { pickNickname } from './nicknames.js'
import { broadcast } from './rooms.js'

function assignFreshNicknames(previousNicknames: string[], count: number): string[] {
  const assigned: string[] = []
  for (let index = 0; index < count; index++) {
    const nickname = pickNickname([...previousNicknames, ...assigned])
    if (!nickname) throw new Error('The nickname pool is too small for a rematch')
    assigned.push(nickname)
  }
  return assigned
}

export async function createRematch(game: Game): Promise<Game | 'not_finished'> {
  if (game.status !== 'finished') return 'not_finished'
  if (game.rematchGameId) {
    const existing = await findGameById(game.rematchGameId)
    if (existing) return existing
  }

  const previousPlayers = await db.query.players.findMany({
    where: eq(players.gameId, game.id),
    orderBy: asc(players.seat),
  })
  const returning = previousPlayers.filter((player) => player.isAi || player.userId)
  const nicknames = assignFreshNicknames(
    previousPlayers.map((player) => player.nickname),
    returning.length,
  )

  const rematchId = crypto.randomUUID()
  const [[rematch], , [linked]] = await db.batch([
    db.insert(games).values({ id: rematchId, code: generateGameCode() }).returning(),
    db.insert(players).values(
      returning.map((player, index) => ({
        gameId: rematchId,
        userId: player.userId,
        nickname: nicknames[index],
        seat: player.seat,
        isAi: player.isAi,
        persona: player.persona,
      })),
    ),
    db
      .update(games)
      .set({ rematchGameId: rematchId })
      .where(and(eq(games.id, game.id), isNull(games.rematchGameId)))
      .returning({ id: games.id }),
  ])

  if (!linked) {
    await db.delete(games).where(eq(games.id, rematchId))
    const current = await findGameById(game.id)
    const firstRematch = current?.rematchGameId ? await findGameById(current.rematchGameId) : undefined
    if (!firstRematch) throw new Error(`Rematch of game ${game.id} vanished`)
    return firstRematch
  }

  broadcast(game.id, {
    type: 'game_state',
    state: await loadGameState({ ...game, rematchGameId: rematch.id }),
  })
  return rematch
}
