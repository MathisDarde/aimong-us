import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from './db/index.js'
import { MAX_HUMANS, MAX_PLAYERS, MIN_PLAYERS, games, messages, players, votes } from './db/schema.js'
import { loadReactionsByMessage } from './reactions.js'
import { MAX_ROUNDS } from './rules.js'
import { onlinePlayerIds } from './rooms.js'

export type Game = typeof games.$inferSelect
export type Player = typeof players.$inferSelect

export type Role = 'ai' | 'human'

export type PublicPlayer = {
  id: string
  nickname: string
  isEliminated: boolean
  online: boolean
  role: Role | null
}

export type GameState = {
  game: Pick<Game, 'id' | 'code' | 'status' | 'round' | 'winner'>
  theme: string | null
  maxRounds: number
  lastResult: { eliminatedId: string | null; role: Role | null } | null
  players: PublicPlayer[]
  hostId: string | null
  minPlayersToStart: number
  maxPlayers: number
  votedPlayerIds: string[]
  rematchCode: string | null
  turn: { playerId: string | null; index: number; endsInMs: number | null }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
export const GAME_CODE_REGEX = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`, 'i')
const MESSAGES_HISTORY_LIMIT = 100
export const HOST_SEAT = 1

export function generateGameCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('')
}

export async function findGameByCode(code: string): Promise<Game | undefined> {
  return db.query.games.findFirst({ where: eq(games.code, code.toUpperCase()) })
}

export async function findGameById(id: string): Promise<Game | undefined> {
  return db.query.games.findFirst({ where: eq(games.id, id) })
}

export async function findPlayerWithGame(
  playerId: string,
): Promise<{ player: Player; game: Game } | undefined> {
  const [row] = await db
    .select({ player: players, game: games })
    .from(players)
    .innerJoin(games, eq(players.gameId, games.id))
    .where(eq(players.id, playerId))
    .limit(1)
  return row
}

export async function findPlayer(gameId: string, userId: string): Promise<Player | undefined> {
  return db.query.players.findFirst({
    where: and(eq(players.gameId, gameId), eq(players.userId, userId)),
  })
}

export function currentTurnPlayerId(game: Game): string | null {
  if (game.status !== 'playing') return null
  return game.turnOrder[game.turnIndex] ?? null
}

export function toPublicPlayer(player: Player, online: boolean, revealAll = false): PublicPlayer {
  const revealed = revealAll || player.isEliminated
  return {
    id: player.id,
    nickname: player.nickname,
    isEliminated: player.isEliminated,
    online: player.isAi || online,
    role: revealed ? roleOf(player) : null,
  }
}

function roleOf(player: Player): Role {
  return player.isAi ? 'ai' : 'human'
}

function lastResult(game: Game, gamePlayers: Player[]) {
  const eliminated = gamePlayers.find((player) => player.id === game.lastEliminatedId)
  return { eliminatedId: eliminated?.id ?? null, role: eliminated ? roleOf(eliminated) : null }
}

async function findRematchCode(game: Game): Promise<string | null> {
  if (!game.rematchGameId) return null
  const rematch = await findGameById(game.rematchGameId)
  return rematch?.code ?? null
}

export async function loadGameState(game: Game): Promise<GameState> {
  const [gamePlayers, roundVotes, rematchCode] = await Promise.all([
    db.query.players.findMany({
      where: eq(players.gameId, game.id),
      orderBy: game.status === 'lobby' ? asc(players.joinedAt) : asc(players.id),
    }),
    db
      .select({ voterId: votes.voterId })
      .from(votes)
      .where(and(eq(votes.gameId, game.id), eq(votes.round, game.round))),
    findRematchCode(game),
  ])
  const online = onlinePlayerIds(game.id)

  return {
    game: {
      id: game.id,
      code: game.code,
      status: game.status,
      round: game.round,
      winner: game.winner,
    },
    theme: game.theme,
    maxRounds: MAX_ROUNDS,
    lastResult: game.status === 'results' ? lastResult(game, gamePlayers) : null,
    players: gamePlayers.map((player) =>
      toPublicPlayer(player, online.has(player.id), game.status === 'finished'),
    ),
    hostId: gamePlayers.find((player) => player.seat === HOST_SEAT)?.id ?? null,
    minPlayersToStart: MIN_PLAYERS,
    maxPlayers: game.status === 'lobby' ? MAX_HUMANS : MAX_PLAYERS,
    votedPlayerIds: roundVotes.map((vote) => vote.voterId),
    rematchCode,
    turn: {
      playerId: currentTurnPlayerId(game),
      index: game.turnIndex,
      endsInMs: game.turnDeadline ? Math.max(0, game.turnDeadline.getTime() - Date.now()) : null,
    },
  }
}

export async function loadRecentMessages(gameId: string) {
  const recent = await db
    .select({
      id: messages.id,
      playerId: messages.playerId,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.gameId, gameId))
    .orderBy(desc(messages.createdAt))
    .limit(MESSAGES_HISTORY_LIMIT)
  const ordered = recent.reverse()
  const reactionsByMessage = await loadReactionsByMessage(ordered.map((message) => message.id))
  return ordered.map((message) => ({ ...message, reactions: reactionsByMessage.get(message.id) ?? [] }))
}
