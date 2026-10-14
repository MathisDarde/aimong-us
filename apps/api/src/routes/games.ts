import { upgradeWebSocket } from '@hono/node-server'
import { and, eq, ne, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { WSContext } from 'hono/ws'
import { fillMissingAis, minAiCount, scheduleAiArrivals } from '../ai-players.js'
import { db } from '../db/index.js'
import {
  MAX_HUMANS,
  MAX_PLAYERS,
  MIN_HUMANS,
  MIN_PLAYERS,
  games,
  players,
  votes,
} from '../db/schema.js'
import { env } from '../env.js'
import {
  HOST_SEAT,
  currentTurnPlayerId,
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
import { logError } from '../logger.js'
import { pickNickname } from '../nicknames.js'
import { PG_CHECK_VIOLATION, PG_UNIQUE_VIOLATION, pgErrorCode } from '../pg-errors.js'
import { postMessage } from '../chat.js'
import { createRateLimiter } from '../rate-limit.js'
import { toggleReaction } from '../reactions.js'
import { clientEventSchema, gameCodeParam, type ClientEvent } from '../schemas.js'
import { clearPhaseTimer, ensurePhaseTimer, handleVoteCast, publishPhaseChange, schedulePhase } from '../phases.js'
import { advanceTurn, beginRound } from '../turns.js'
import { validate } from '../validation.js'
import {
  broadcast,
  disconnectPlayer,
  joinRoom,
  leaveRoom,
  onlinePlayerIds,
  send,
  type Client,
} from '../rooms.js'

const WS_POLICY_VIOLATION = 1008
const GAME_CREATION_WINDOW_MS = 60_000
const GAME_CREATION_MAX = 5
const CODE_GENERATION_ATTEMPTS = 5

const isEventRateLimited = createRateLimiter({ max: 5, windowMs: 10_000 })
const isTypingRateLimited = createRateLimiter({ max: 8, windowMs: 10_000 })
const isReactionRateLimited = createRateLimiter({ max: 10, windowMs: 10_000 })
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
    logError('websocket handler failed', err)
    send(ws, { type: 'error', message: 'Internal error' })
  })
}

async function handleChat(game: Game, player: Player, content: string, ws: WSContext) {
  if (game.status === 'finished' || game.status === 'results') {
    return send(ws, { type: 'error', message: 'Chat is closed' })
  }
  if (player.isEliminated) {
    return send(ws, { type: 'error', message: 'Eliminated players cannot chat' })
  }

  if (game.status !== 'playing') return postMessage(game, player, content)

  const claimed =
    currentTurnPlayerId(game) === player.id ? await advanceTurn(game.id, player.id) : undefined
  if (!claimed) return send(ws, { type: 'error', message: 'It is not your turn' })

  await postMessage(game, player, content)
  await publishPhaseChange(claimed)
}

async function handleReact(
  game: Game,
  player: Player,
  messageId: string,
  emoji: string,
  ws: WSContext,
) {
  if (game.status === 'finished') return send(ws, { type: 'error', message: 'The game is over' })
  if (player.isEliminated) {
    return send(ws, { type: 'error', message: 'Eliminated players cannot react' })
  }
  if ((await toggleReaction(game.id, messageId, player.id, emoji)) === 'message_not_found') {
    send(ws, { type: 'error', message: 'Message not found' })
  }
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

  await handleVoteCast(game.id)
}

async function handleClientMessage(gameId: string, playerId: string, raw: unknown, ws: WSContext) {
  const event = parseClientEvent(raw)
  if (event?.type === 'typing') {
    if (!isTypingRateLimited(playerId)) broadcast(gameId, { type: 'typing', playerId })
    return
  }

  const limited =
    event?.type === 'react' ? isReactionRateLimited(playerId) : isEventRateLimited(playerId)
  if (limited) {
    return send(ws, { type: 'error', message: 'Too many messages, wait a few seconds' })
  }

  if (!event) return send(ws, { type: 'error', message: 'Invalid event' })

  const found = await findPlayerWithGame(playerId)
  if (!found) return ws.close(WS_POLICY_VIOLATION, 'Game or player not found')
  const { game, player } = found

  if (event.type === 'chat') return handleChat(game, player, event.content, ws)
  if (event.type === 'react') return handleReact(game, player, event.messageId, event.emoji, ws)
  return handleVote(game, player, event.targetId, ws)
}

async function startLobbyGame(game: Game): Promise<Game | 'not_enough_players' | 'conflict'> {
  const seated = await db.query.players.findMany({ where: eq(players.gameId, game.id) })
  const humanCount = seated.filter((player) => !player.isAi).length
  const aiCount = Math.max(seated.length - humanCount, minAiCount())
  if (humanCount < MIN_HUMANS || humanCount + aiCount < MIN_PLAYERS) return 'not_enough_players'

  await fillMissingAis(game.id)

  const [started] = await db
    .update(games)
    .set({ status: 'playing', round: 1 })
    .where(and(eq(games.id, game.id), eq(games.status, 'lobby')))
    .returning()
  if (!started) return 'conflict'
  return (await beginRound(started)) ?? 'conflict'
}

async function stopGame(game: Game): Promise<Game | undefined> {
  const [stopped] = await db
    .update(games)
    .set({ status: 'finished', winner: null })
    .where(and(eq(games.id, game.id), ne(games.status, 'finished')))
    .returning()
  clearPhaseTimer(game.id)
  if (stopped) broadcast(game.id, { type: 'game_state', state: await loadGameState(stopped) })
  return stopped
}

async function seatPlayer(
  game: Game,
  user: AuthUser,
): Promise<{ player: Player; created: boolean } | 'full'> {
  for (let attempt = 0; attempt < MAX_PLAYERS; attempt++) {
    const seated = await db.query.players.findMany({ where: eq(players.gameId, game.id) })
    if (seated.length >= MAX_PLAYERS) return 'full'
    const nickname = pickNickname(seated.map((player) => player.nickname))
    if (!nickname) return 'full'

    try {
      const [inserted] = await db
        .insert(players)
        .values({
          gameId: game.id,
          userId: user.id,
          nickname,
          seat: sql`coalesce(
            (select min(s) from generate_series(1, ${MAX_HUMANS}) s
             where s not in (select ${players.seat} from ${players} where ${players.gameId} = ${game.id})),
            ${MAX_HUMANS + 1}
          )`,
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
      const nickname = pickNickname([])
      if (!nickname) throw new Error('The nickname pool is empty')
      const [[game], [player]] = await db.batch([
        db.insert(games).values({ id: gameId, code }).returning(),
        db.insert(players).values({ gameId, userId: user.id, nickname, seat: 1 }).returning(),
      ])
      scheduleAiArrivals(game.id)
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
  .post('/:code/start', validate('param', gameCodeParam), requirePlayer, async (c) => {
    const game = c.get('game')
    if (c.get('player').seat !== HOST_SEAT) {
      return c.json({ error: 'Only the host can start the game' }, 403)
    }
    if (game.status !== 'lobby') return c.json({ error: 'The game has already started' }, 409)

    const started = await startLobbyGame(game)
    if (started === 'not_enough_players') {
      return c.json({ error: `At least ${MIN_PLAYERS} players are needed to start` }, 409)
    }
    if (started === 'conflict') {
      return c.json({ error: 'The lobby changed, try again' }, 409)
    }

    const state = await loadGameState(started)
    broadcast(game.id, { type: 'game_state', state })
    await schedulePhase(started)
    return c.json({ state })
  })
  .post('/:code/stop', validate('param', gameCodeParam), requirePlayer, async (c) => {
    if (c.get('player').seat !== HOST_SEAT) {
      return c.json({ error: 'Only the host can stop the game' }, 403)
    }
    const stopped = await stopGame(c.get('game'))
    if (!stopped) return c.json({ error: 'The game is already over' }, 409)
    return c.json({ state: await loadGameState(stopped) })
  })
  .post('/:code/leave', validate('param', gameCodeParam), requirePlayer, async (c) => {
    const game = c.get('game')
    const player = c.get('player')
    if (game.status !== 'lobby') return c.body(null, 204)

    if (player.seat === HOST_SEAT) {
      await stopGame(game)
      return c.body(null, 204)
    }

    await db.delete(players).where(eq(players.id, player.id))
    disconnectPlayer(game.id, player.id)
    broadcast(game.id, { type: 'game_state', state: await loadGameState(game) })
    return c.body(null, 204)
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
      const tokenExpiresAt: number = c.get('tokenExpiresAt')
      let client: Client | undefined
      let expiryTimer: ReturnType<typeof setTimeout> | undefined

      return {
        onOpen(_evt, ws) {
          const isFirstConnection = !onlinePlayerIds(gameId).has(playerId)
          client = { playerId, ws }
          expiryTimer = setTimeout(
            () => ws.close(WS_POLICY_VIOLATION, 'Token expired'),
            Math.max(0, tokenExpiresAt - Date.now()),
          )
          joinRoom(gameId, client)

          runSafely(ws, async () => {
            const game = await findGameById(gameId)
            if (!game) return ws.close(WS_POLICY_VIOLATION, 'Game not found')
            await ensurePhaseTimer(game)
            const state = await loadGameState(game)
            if (isFirstConnection) broadcast(gameId, { type: 'game_state', state })
            else send(ws, { type: 'game_state', state })
          })
        },
        onMessage(evt, ws) {
          runSafely(ws, () => handleClientMessage(gameId, playerId, evt.data, ws))
        },
        onClose() {
          clearTimeout(expiryTimer)
          if (!client) return
          leaveRoom(gameId, client)
          if (!onlinePlayerIds(gameId).has(playerId)) {
            broadcast(gameId, { type: 'player_left', playerId })
          }
        },
      }
    }),
  )
