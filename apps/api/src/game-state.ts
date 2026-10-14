import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from './db/index.js'
import { MAX_HUMANS, MAX_PLAYERS, MIN_HUMANS, games, messages, players, votes } from './db/schema.js'
import { onlinePlayerIds } from './rooms.js'

export type Game = typeof games.$inferSelect
export type Player = typeof players.$inferSelect

export type PublicPlayer = {
  id: string
  nickname: string
  isEliminated: boolean
  online: boolean
}

export type GameState = {
  game: Pick<Game, 'id' | 'code' | 'status' | 'round' | 'winner'>
  players: PublicPlayer[]
  hostId: string | null
  minPlayersToStart: number
  maxPlayers: number
  votedPlayerIds: string[]
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

export function toPublicPlayer(player: Player, online: boolean): PublicPlayer {
  return {
    id: player.id,
    nickname: player.nickname,
    isEliminated: player.isEliminated,
    online: player.isAi || online,
  }
}

export async function loadGameState(game: Game): Promise<GameState> {
  const [gamePlayers, roundVotes] = await Promise.all([
    db.query.players.findMany({
      where: eq(players.gameId, game.id),
      orderBy: game.status === 'lobby' ? asc(players.joinedAt) : asc(players.id),
    }),
    db
      .select({ voterId: votes.voterId })
      .from(votes)
      .where(and(eq(votes.gameId, game.id), eq(votes.round, game.round))),
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
    players: gamePlayers.map((player) => toPublicPlayer(player, online.has(player.id))),
    hostId: gamePlayers.find((player) => player.seat === HOST_SEAT)?.id ?? null,
    minPlayersToStart: MIN_HUMANS,
    maxPlayers: game.status === 'lobby' ? MAX_HUMANS : MAX_PLAYERS,
    votedPlayerIds: roundVotes.map((vote) => vote.voterId),
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
  return recent.reverse()
}
