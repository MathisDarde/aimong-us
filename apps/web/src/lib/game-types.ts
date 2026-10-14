export type GameStatus = 'lobby' | 'playing' | 'voting' | 'finished'

export type PublicPlayer = {
  id: string
  nickname: string
  isEliminated: boolean
  online: boolean
}

export type GameState = {
  game: { id: string; code: string; status: GameStatus; round: number; winner: string | null }
  players: PublicPlayer[]
  hostId: string | null
  minPlayersToStart: number
  maxPlayers: number
  votedPlayerIds: string[]
  turn: { playerId: string | null; index: number; endsInMs: number | null }
}

export type ChatMessage = {
  id: string
  playerId: string
  content: string
  createdAt: string
}

export type GameSnapshot = {
  state: GameState
  me: string | null
  messages: ChatMessage[]
}

export type ServerEvent =
  | { type: 'chat'; message: ChatMessage }
  | { type: 'player_joined'; player: PublicPlayer }
  | { type: 'player_left'; playerId: string }
  | { type: 'game_state'; state: GameState }
  | { type: 'typing'; playerId: string }
  | { type: 'error'; message: string }

export type ClientEvent =
  | { type: 'chat'; content: string }
  | { type: 'vote'; targetId: string }
  | { type: 'typing' }
