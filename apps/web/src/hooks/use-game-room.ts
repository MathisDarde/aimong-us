import { useCallback, useEffect, useRef, useState } from 'react'
import { getAccessToken } from '@/lib/auth-client'
import { WEBSOCKET_BEARER_PROTOCOL, gameSocketUrl, loadGameSnapshot } from '@/lib/game-api'
import type { ChatMessage, ClientEvent, GameState, ServerEvent } from '@/lib/game-types'

export type RoomStatus = 'loading' | 'live' | 'disconnected' | 'error'

function parseServerEvent(raw: unknown): ServerEvent | null {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as ServerEvent
  } catch {
    return null
  }
}

function applyEvent(state: GameState, event: ServerEvent): GameState {
  if (event.type === 'game_state') return event.state
  if (event.type === 'player_joined') {
    if (state.players.some((player) => player.id === event.player.id)) return state
    return { ...state, players: [...state.players, event.player] }
  }
  if (event.type === 'player_left') {
    return {
      ...state,
      players: state.players.map((player) =>
        player.id === event.playerId ? { ...player, online: false } : player,
      ),
    }
  }
  return state
}

export function useGameRoom(code: string) {
  const [state, setState] = useState<GameState | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [status, setStatus] = useState<RoomStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let cancelled = false

    function handleEvent(event: ServerEvent) {
      if (event.type === 'chat') {
        setMessages((current) =>
          current.some((message) => message.id === event.message.id)
            ? current
            : [...current, event.message],
        )
        return
      }
      if (event.type === 'error') {
        setNotice(event.message)
        return
      }
      setState((current) => (current ? applyEvent(current, event) : current))
    }

    async function connect() {
      try {
        const snapshot = await loadGameSnapshot(code)
        if (cancelled) return
        setState(snapshot.state)
        setMessages(snapshot.messages)
        setMe(snapshot.me)

        const token = await getAccessToken()
        if (cancelled) return
        const socket = new WebSocket(gameSocketUrl(code), [WEBSOCKET_BEARER_PROTOCOL, token])
        socketRef.current = socket
        socket.onopen = () => setStatus('live')
        socket.onclose = () => {
          if (!cancelled) setStatus('disconnected')
        }
        socket.onmessage = (message) => {
          const event = parseServerEvent(message.data)
          if (event) handleEvent(event)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load the game')
        setStatus('error')
      }
    }

    void connect()

    return () => {
      cancelled = true
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [code])

  const send = useCallback((event: ClientEvent) => {
    const socket = socketRef.current
    if (socket?.readyState !== WebSocket.OPEN) return
    setNotice(null)
    socket.send(JSON.stringify(event))
  }, [])

  return { state, messages, me, status, error, notice, send }
}
