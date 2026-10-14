import { apiFetch } from '@/lib/api'
import type { GameSnapshot, GameState } from '@/lib/game-types'

type GameEntry = { state: GameState; me: string }

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export function createGame() {
  return apiFetch<GameEntry>('/api/games', { method: 'POST', headers: JSON_HEADERS })
}

export function fetchGame(code: string) {
  return apiFetch<GameSnapshot>(`/api/games/${code}`)
}

export function joinGame(code: string) {
  return apiFetch<GameEntry>(`/api/games/${code}/join`, { method: 'POST', headers: JSON_HEADERS })
}

export function startGame(code: string) {
  return apiFetch<{ state: GameState }>(`/api/games/${code}/start`, {
    method: 'POST',
    headers: JSON_HEADERS,
  })
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
  return `${protocol}://${window.location.host}/api/games/${code}/ws`
}
