import type { WSContext } from 'hono/ws'
import type { GameState, PublicPlayer } from './game-state.js'

export type ServerEvent =
  | { type: 'chat'; message: { id: string; playerId: string; content: string; createdAt: Date } }
  | { type: 'player_joined'; player: PublicPlayer }
  | { type: 'player_left'; playerId: string }
  | { type: 'game_state'; state: GameState }
  | { type: 'typing'; playerId: string }
  | { type: 'reaction'; messageId: string; playerId: string; emoji: string; active: boolean }
  | { type: 'error'; message: string }

export type Client = { playerId: string; ws: WSContext }

const WS_NORMAL_CLOSURE = 1000

const rooms = new Map<string, Set<Client>>()

export function joinRoom(gameId: string, client: Client) {
  const room = rooms.get(gameId) ?? new Set()
  room.add(client)
  rooms.set(gameId, room)
}

export function leaveRoom(gameId: string, client: Client) {
  const room = rooms.get(gameId)
  if (!room) return
  room.delete(client)
  if (room.size === 0) rooms.delete(gameId)
}

export function onlinePlayerIds(gameId: string): Set<string> {
  return new Set([...(rooms.get(gameId) ?? [])].map((client) => client.playerId))
}

export function send(ws: WSContext, event: ServerEvent) {
  if (ws.readyState === 1) ws.send(JSON.stringify(event))
}

export function broadcast(gameId: string, event: ServerEvent) {
  const payload = JSON.stringify(event)
  for (const client of rooms.get(gameId) ?? []) {
    if (client.ws.readyState === 1) client.ws.send(payload)
  }
}

export function disconnectPlayer(gameId: string, playerId: string) {
  for (const client of rooms.get(gameId) ?? []) {
    if (client.playerId === playerId) client.ws.close(WS_NORMAL_CLOSURE, 'Left the game')
  }
}
