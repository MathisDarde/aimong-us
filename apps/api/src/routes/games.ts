import { upgradeWebSocket } from '@hono/node-server'
import { and, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { WSContext } from 'hono/ws'
import { db } from '../db/index.js'
import { MAX_PLAYERS, games, messages, players, votes } from '../db/schema.js'
import { env } from '../env.js'
import {
  findGameByCode,
  findGameById,
  findPlayer,
  findPlayerWithGame,
  generateGameCode,
  loadGameState,
  loadRecentMessages,
  toPublicPlayer,
  type Game,
  type Player,
} from '../game-state.js'
import { requireAuth, type AuthEnv, type AuthUser } from '../middleware/auth.js'
import { createRateLimiter } from '../rate-limit.js'
import { clientEventSchema, gameCodeParam, type ClientEvent } from '../schemas.js'
import { validate } from '../validation.js'
import { broadcast, joinRoom, leaveRoom, onlinePlayerIds, send, type Client } from '../rooms.js'

const SEAT_ATTEMPTS = 3
const PG_UNIQUE_VIOLATION = '23505'
const PG_CHECK_VIOLATION = '23514'
const GAME_CREATION_WINDOW_MS = 60_000
const GAME_CREATION_MAX = 5
const CODE_GENERATION_ATTEMPTS = 5

const isEventRateLimited = createRateLimiter({ max: 5, windowMs: 10_000 })
const isGameCreationRateLimited = createRateLimiter({
  max: GAME_CREATION_MAX,
  windowMs: GAME_CREATION_WINDOW_MS,
})

type PlayerEnv = {
  Variables: AuthEnv['Variables'] & { game: Game; player: Player }
}

const requireSameOrigin = createMiddleware(async (c, next) => {
  if (c.req.header('origin') !== env.WEB_ORIGIN) return c.json({ error: 'Origin not allowed' }, 403)
  await next()
})

const requirePlayer = createMiddleware<PlayerEnv>(async (c, next) => {
  const game = await findGameByCode(c.req.param('code') ?? '')
  if (!game) return c.json({ error: 'Game not found' }, 404)
  const player = await findPlayer(game.id, c.get('user').id)
  if (!player) return c.json({ error: 'You are not a player in this game' }, 403)
  c.set('game', game)
  c.set('player', player)
  await next()
})

function parseClientEvent(raw: unknown): ClientEvent | null {
  if (typeof raw !== 'string') return null
  try {
    const result = clientEventSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

function runSafely(ws: WSContext, task: () => Promise<void>) {
  task().catch((err) => {
    console.error(err)
    send(ws, { type: 'error', message: 'Internal error' })
  })
}

async function handleChat(game: Game, player: Player, content: string, ws: WSContext) {
  if (game.status === 'finished') {
    return send(ws, { type: 'error', message: 'The game is over' })
  }
  if (player.isEliminated) {
    return send(ws, { type: 'error', message: 'Eliminated players cannot chat' })
  }

  const [message] = await db
    .insert(messages)
    .values({ gameId: game.id, playerId: player.id, content })
    .returning({
      id: messages.id,
      playerId: messages.playerId,
      content: messages.content,
      createdAt: messages.createdAt,
    })
  broadcast(game.id, { type: 'chat', message })
}

async function handleVote(game: Game, player: Player, targetId: string, ws: WSContext) {
  if (game.status !== 'voting') {
    return send(ws, { type: 'error', message: 'It is not time to vote' })
  }
  if (player.isEliminated) {
    return send(ws, { type: 'error', message: 'Eliminated players cannot vote' })
  }
  if (targetId === player.id) {
    return send(ws, { type: 'error', message: 'You cannot vote for yourself' })
  }

  const target = await db.query.players.findFirst({
    where: and(eq(players.id, targetId), eq(players.gameId, game.id)),
  })
  if (!target || target.isEliminated) {
    return send(ws, { type: 'error', message: 'Invalid target player' })
  }

  const [vote] = await db
    .insert(votes)
    .values({ gameId: game.id, round: game.round, voterId: player.id, targetId })
    .onConflictDoNothing()
    .returning({ id: votes.id })
  if (!vote) {
    return send(ws, { type: 'error', message: 'You have already voted this round' })
  }

  broadcast(game.id, { type: 'game_state', state: await loadGameState(game) })
}

async function handleClientMessage(playerId: string, raw: unknown, ws: WSContext) {
  if (isEventRateLimited(playerId)) {
    return send(ws, { type: 'error', message: 'Too many messages, wait a few seconds' })
  }

  const event = parseClientEvent(raw)
  if (!event) return send(ws, { type: 'error', message: 'Invalid event' })

  const found = await findPlayerWithGame(playerId)
  if (!found) return ws.close(1008, 'Game or player not found')
  const { game, player } = found

  if (event.type === 'chat') return handleChat(game, player, event.content, ws)
  return handleVote(game, player, event.targetId, ws)
}

function pgErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  if ('code' in err && typeof err.code === 'string') return err.code
  return 'cause' in err ? pgErrorCode(err.cause) : undefined
}

async function seatPlayer(
  game: Game,
  user: AuthUser,
): Promise<{ player: Player; created: boolean } | 'full'> {
  for (let attempt = 0; attempt < SEAT_ATTEMPTS; attempt++) {
    try {
      const [inserted] = await db
        .insert(players)
        .values({
          gameId: game.id,
          userId: user.id,
          nickname: user.name,
          seat: sql`(select coalesce(max(${players.seat}), 0) + 1 from ${players} where ${players.gameId} = ${game.id})`,
        })
        .onConflictDoNothing({ target: [players.gameId, players.userId] })
        .returning()
      if (inserted) return { player: inserted, created: true }

      const existing = await findPlayer(game.id, user.id)
      if (existing) return { player: existing, created: false }
    } catch (err) {
      const code = pgErrorCode(err)
      if (code === PG_CHECK_VIOLATION) return 'full'
      if (code !== PG_UNIQUE_VIOLATION) throw err
    }
  }
  throw new Error(`Could not seat user ${user.id} in game ${game.id}`)
}

export const gamesRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post('/', async (c) => {
    const user = c.get('user')
    if (isGameCreationRateLimited(user.id)) {
      return c.json({ error: 'Too many games created, try again in a minute' }, 429)
    }

    for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt++) {
      const code = generateGameCode()
      if (await findGameByCode(code)) continue

      const gameId = crypto.randomUUID()
      const [[game], [player]] = await db.batch([
        db.insert(games).values({ id: gameId, code }).returning(),
        db.insert(players).values({ gameId, userId: user.id, nickname: user.name, seat: 1 }).returning(),
      ])
      return c.json({ state: await loadGameState(game), me: player.id }, 201)
    }

    throw new Error('Could not generate a unique game code')
  })
  .post('/:code/join', validate('param', gameCodeParam), async (c) => {
    const user = c.get('user')
    const game = await findGameByCode(c.req.param('code'))
    if (!game) return c.json({ error: 'Game not found' }, 404)

    const existing = await findPlayer(game.id, user.id)
    if (existing) return c.json({ state: await loadGameState(game), me: existing.id })

    if (game.status !== 'lobby') return c.json({ error: 'The game has already started' }, 409)

    const seated = await seatPlayer(game, user)
    if (seated === 'full') return c.json({ error: 'The game is full' }, 409)

    const { player, created } = seated
    if (created) {
      const online = onlinePlayerIds(game.id).has(player.id)
      broadcast(game.id, { type: 'player_joined', player: toPublicPlayer(player, online) })
    }
    return c.json({ state: await loadGameState(game), me: player.id }, created ? 201 : 200)
  })
  .get('/:code', validate('param', gameCodeParam), async (c) => {
    const game = await findGameByCode(c.req.param('code'))
    if (!game) return c.json({ error: 'Game not found' }, 404)

    const player = await findPlayer(game.id, c.get('user').id)
    const [state, recentMessages] = await Promise.all([
      loadGameState(game),
      player ? loadRecentMessages(game.id) : [],
    ])
    return c.json({ state, me: player?.id ?? null, messages: recentMessages })
  })
  .get(
    '/:code/ws',
    validate('param', gameCodeParam),
    requireSameOrigin,
    requirePlayer,
    upgradeWebSocket((c) => {
      const gameId: string = c.get('game').id
      const playerId: string = c.get('player').id
      let client: Client | undefined

      return {
        onOpen(_evt, ws) {
          const isFirstConnection = !onlinePlayerIds(gameId).has(playerId)
          client = { playerId, ws }
          joinRoom(gameId, client)

          runSafely(ws, async () => {
            const game = await findGameById(gameId)
            if (!game) return ws.close(1008, 'Game not found')
            const state = await loadGameState(game)
            if (isFirstConnection) broadcast(gameId, { type: 'game_state', state })
            else send(ws, { type: 'game_state', state })
          })
        },
        onMessage(evt, ws) {
          runSafely(ws, () => handleClientMessage(playerId, evt.data, ws))
        },
        onClose() {
          if (!client) return
          leaveRoom(gameId, client)
          if (!onlinePlayerIds(gameId).has(playerId)) {
            broadcast(gameId, { type: 'player_left', playerId })
          }
        },
      }
    }),
  )
