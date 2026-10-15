export type GameStatus = 'lobby' | 'playing' | 'voting' | 'results' | 'finished'

export type Role = 'ai' | 'human'

export type PublicPlayer = {
  id: string
  nickname: string
  isEliminated: boolean
  online: boolean
  role: Role | null
}

export type GameState = {
  game: { id: string; code: string; status: GameStatus; round: number; winner: string | null }
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

export type MessageReaction = { emoji: string; playerIds: string[] }

export type ChatMessage = {
  id: string
  playerId: string
  content: string
  createdAt: string
  reactions?: MessageReaction[]
}

export type ReactionEvent = {
  type: 'reaction'
  messageId: string
  playerId: string
  emoji: string
  active: boolean
}

export type GameSnapshot = {
  state: GameState
  me: string | null
  messages: ChatMessage[]
}

export type ServerEvent =
  | { type: 'chat'; message: ChatMessage }
  | ReactionEvent
  | { type: 'player_joined'; player: PublicPlayer }
  | { type: 'player_left'; playerId: string }
  | { type: 'game_state'; state: GameState }
  | { type: 'typing'; playerId: string }
  | { type: 'error'; message: string }

export type ClientEvent =
  | { type: 'chat'; content: string }
  | { type: 'vote'; targetId: string }
  | { type: 'typing' }
  | { type: 'react'; messageId: string; emoji: string }
