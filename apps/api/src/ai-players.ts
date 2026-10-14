import { randomInt } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { db } from './db/index.js'
import { MAX_AIS, MAX_PLAYERS, MIN_AIS, games, players } from './db/schema.js'
import { env } from './env.js'
import { toPublicPlayer } from './game-state.js'
import { logError } from './logger.js'
import { pickNickname } from './nicknames.js'
import { pickPersona } from './personas.js'
import { PG_NOT_NULL_VIOLATION, PG_UNIQUE_VIOLATION, pgErrorCode } from './pg-errors.js'
import { broadcast } from './rooms.js'

const AI_ARRIVAL_MIN_GAP_MS = 3_000
const AI_ARRIVAL_MAX_GAP_MS = 25_000
const AI_SEAT_ATTEMPTS = 3

export async function seatAiInLobby(gameId: string): Promise<void> {
  for (let attempt = 0; attempt < AI_SEAT_ATTEMPTS; attempt++) {
    const seated = await db.query.players.findMany({ where: eq(players.gameId, gameId) })
    const nickname = pickNickname(seated.map((player) => player.nickname))
    if (!nickname) return

    try {
      const [ai] = await db
        .insert(players)
        .values({
          gameId,
          nickname,
          isAi: true,
          persona: pickPersona(),
          seat: sql`(select max(s) from generate_series(1, ${MAX_PLAYERS}) s
            where s not in (select ${players.seat} from ${players} where ${players.gameId} = ${gameId})
            and exists (select 1 from ${games} where ${games.id} = ${gameId} and ${games.status} = 'lobby'))`,
        })
        .returning()
      broadcast(gameId, { type: 'player_joined', player: toPublicPlayer(ai, true) })
      return
    } catch (err) {
      const code = pgErrorCode(err)
      if (code === PG_NOT_NULL_VIOLATION) return
      if (code !== PG_UNIQUE_VIOLATION) throw err
    }
  }
}

export function minAiCount(): number {
  return env.FORCE_MAX_AIS ? MAX_AIS : MIN_AIS
}

export async function fillMissingAis(gameId: string): Promise<void> {
  const seated = await db.query.players.findMany({ where: eq(players.gameId, gameId) })
  const missing = minAiCount() - seated.filter((player) => player.isAi).length
  for (let index = 0; index < missing; index++) await seatAiInLobby(gameId)
}

export function scheduleAiArrivals(gameId: string) {
  const aiCount = env.FORCE_MAX_AIS ? MAX_AIS : randomInt(MIN_AIS, MAX_AIS + 1)
  let delay = 0
  for (let index = 0; index < aiCount; index++) {
    delay += randomInt(AI_ARRIVAL_MIN_GAP_MS, AI_ARRIVAL_MAX_GAP_MS + 1)
    setTimeout(() => {
      seatAiInLobby(gameId).catch((err) => logError('AI arrival failed', err, { gameId }))
    }, delay)
  }
}
