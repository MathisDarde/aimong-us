import { apiFetch } from '@/lib/api'
import type { GameSnapshot, GameState } from '@/lib/game-types'

type GameEntry = { state: GameState; me: string }

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export function createGame() {
  return apiFetch<GameEntry>('/api/v1/games', { method: 'POST', headers: JSON_HEADERS })
}

export function fetchGame(code: string) {
  return apiFetch<GameSnapshot>(`/api/v1/games/${code}`)
}

export function joinGame(code: string) {
  return apiFetch<GameEntry>(`/api/v1/games/${code}/join`, { method: 'POST', headers: JSON_HEADERS })
}

export async function loadGameSnapshot(code: string): Promise<GameSnapshot> {
  const snapshot = await fetchGame(code)
  if (snapshot.me) return snapshot
  await joinGame(code)
  return fetchGame(code)
}

export const WEBSOCKET_BEARER_PROTOCOL = 'bearer'

export function gameSocketUrl(code: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/api/v1/games/${code}/ws`
}
