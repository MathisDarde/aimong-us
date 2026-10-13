import { upgradeWebSocket } from '@hono/node-server'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { WSContext } from 'hono/ws'
import { db } from '../db/index.js'
import { games, messages, players, votes } from '../db/schema.js'
import { env } from '../env.js'
import {
  findGameByCode,
  findGameById,
  findPlayer,
  findPlayerById,
  generateGameCode,
  loadGameState,
  loadRecentMessages,
  toPublicPlayer,
  type Game,
  type Player,
} from '../game-state.js'
import { requireAuth, type AuthEnv } from '../middleware/auth.js'
import { broadcast, joinRoom, leaveRoom, onlinePlayerIds, send, type Client } from '../rooms.js'

const CHAT_MAX_LENGTH = 500
const CODE_GENERATION_ATTEMPTS = 5
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ClientEvent = { type: 'chat'; content: string } | { type: 'vote'; targetId: string }

type PlayerEnv = {
  Variables: AuthEnv['Variables'] & { game: Game; player: Player }
}

const requireSameOrigin = createMiddleware(async (c, next) => {
  if (c.req.header('origin') !== env.WEB_ORIGIN) return c.json({ error: 'Origine refusée' }, 403)
  await next()
})

const requirePlayer = createMiddleware<PlayerEnv>(async (c, next) => {
  const game = await findGameByCode(c.req.param('code') ?? '')
  if (!game) return c.json({ error: 'Partie introuvable' }, 404)
  const player = await findPlayer(game.id, c.get('user').id)
  if (!player) return c.json({ error: "Tu ne fais pas partie de cette partie" }, 403)
  c.set('game', game)
  c.set('player', player)
  await next()
})

function parseClientEvent(raw: unknown): ClientEvent | null {
  if (typeof raw !== 'string') return null
  try {
    const data = JSON.parse(raw)
    if (data?.type === 'chat' && typeof data.content === 'string') {
      return { type: 'chat', content: data.content }
    }
    if (data?.type === 'vote' && typeof data.targetId === 'string' && UUID_REGEX.test(data.targetId)) {
      return { type: 'vote', targetId: data.targetId }
    }
    return null
  } catch {
    return null
  }
}

function runSafely(ws: WSContext, task: () => Promise<void>) {
  task().catch((err) => {
    console.error(err)
    send(ws, { type: 'error', message: 'Erreur interne' })
  })
}

async function handleChat(game: Game, player: Player, rawContent: string, ws: WSContext) {
  const content = rawContent.trim()
  if (!content || content.length > CHAT_MAX_LENGTH) {
    return send(ws, {
      type: 'error',
      message: `Le message doit faire entre 1 et ${CHAT_MAX_LENGTH} caractères`,
    })
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
    return send(ws, { type: 'error', message: "Ce n'est pas le moment de voter" })
  }
  if (player.isEliminated) {
    return send(ws, { type: 'error', message: 'Les joueurs éliminés ne peuvent pas voter' })
  }
  if (targetId === player.id) {
    return send(ws, { type: 'error', message: 'Tu ne peux pas voter contre toi-même' })
  }

  const target = await db.query.players.findFirst({
    where: and(eq(players.id, targetId), eq(players.gameId, game.id)),
  })
  if (!target || target.isEliminated) {
    return send(ws, { type: 'error', message: 'Joueur ciblé invalide' })
  }

  const [vote] = await db
    .insert(votes)
    .values({ gameId: game.id, round: game.round, voterId: player.id, targetId })
    .onConflictDoNothing()
    .returning({ id: votes.id })
  if (!vote) {
    return send(ws, { type: 'error', message: 'Tu as déjà voté pour cette manche' })
  }

  broadcast(game.id, { type: 'game_state', state: await loadGameState(game) })
}

async function handleClientMessage(gameId: string, playerId: string, raw: unknown, ws: WSContext) {
  const event = parseClientEvent(raw)
  if (!event) return send(ws, { type: 'error', message: 'Événement invalide' })

  const [game, player] = await Promise.all([findGameById(gameId), findPlayerById(playerId)])
  if (!game || !player) return ws.close(1008, 'Partie ou joueur introuvable')

  if (event.type === 'chat') return handleChat(game, player, event.content, ws)
  return handleVote(game, player, event.targetId, ws)
}

export const gamesRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post('/', async (c) => {
    const user = c.get('user')

    for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt++) {
      const code = generateGameCode()
      if (await findGameByCode(code)) continue

      const gameId = crypto.randomUUID()
      const [[game], [player]] = await db.batch([
        db.insert(games).values({ id: gameId, code }).returning(),
        db.insert(players).values({ gameId, userId: user.id, nickname: user.name }).returning(),
      ])
      return c.json({ state: await loadGameState(game), me: player.id }, 201)
    }

    throw new Error('Impossible de générer un code de partie unique')
  })
  .post('/:code/join', async (c) => {
    const user = c.get('user')
    const game = await findGameByCode(c.req.param('code'))
    if (!game) return c.json({ error: 'Partie introuvable' }, 404)

    const existing = await findPlayer(game.id, user.id)
    if (existing) return c.json({ state: await loadGameState(game), me: existing.id })

    if (game.status !== 'lobby') return c.json({ error: 'La partie a déjà commencé' }, 409)

    const [inserted] = await db
      .insert(players)
      .values({ gameId: game.id, userId: user.id, nickname: user.name })
      .onConflictDoNothing()
      .returning()
    const player = inserted ?? (await findPlayer(game.id, user.id))
    if (!player) throw new Error(`Inscription impossible à la partie ${game.id}`)

    if (inserted) {
      const online = onlinePlayerIds(game.id).has(player.id)
      broadcast(game.id, { type: 'player_joined', player: toPublicPlayer(player, online) })
    }
    return c.json({ state: await loadGameState(game), me: player.id }, inserted ? 201 : 200)
  })
  .get('/:code', async (c) => {
    const game = await findGameByCode(c.req.param('code'))
    if (!game) return c.json({ error: 'Partie introuvable' }, 404)

    const player = await findPlayer(game.id, c.get('user').id)
    const [state, recentMessages] = await Promise.all([
      loadGameState(game),
      player ? loadRecentMessages(game.id) : [],
    ])
    return c.json({ state, me: player?.id ?? null, messages: recentMessages })
  })
  .get(
    '/:code/ws',
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
            if (!game) return ws.close(1008, 'Partie introuvable')
            const state = await loadGameState(game)
            if (isFirstConnection) broadcast(gameId, { type: 'game_state', state })
            else send(ws, { type: 'game_state', state })
          })
        },
        onMessage(evt, ws) {
          runSafely(ws, () => handleClientMessage(gameId, playerId, evt.data, ws))
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
