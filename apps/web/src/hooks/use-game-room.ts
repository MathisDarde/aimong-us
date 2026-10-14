import { useCallback, useEffect, useRef, useState } from 'react'
import { getAccessToken } from '@/lib/auth-client'
import { ApiError } from '@/lib/api'
import {
  WEBSOCKET_BEARER_PROTOCOL,
  fetchGame,
  gameSocketUrl,
  leaveGame,
  loadGameSnapshot,
  startGame,
  stopGame,
} from '@/lib/game-api'
import type { ChatMessage, ClientEvent, GameState, ServerEvent } from '@/lib/game-types'

const MAX_RECONNECT_ATTEMPTS = 8
const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 15_000
const HTTP_SERVER_ERROR = 500

export type RoomStatus = 'loading' | 'live' | 'disconnected' | 'error'

function parseServerEvent(raw: unknown): ServerEvent | null {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw) as ServerEvent
  } catch {
    return null
  }
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
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
    let failures = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    function fail(message: string) {
      setError(message)
      setStatus('error')
    }

    function scheduleReconnect() {
      failures += 1
      if (failures > MAX_RECONNECT_ATTEMPTS) {
        fail('Connection lost, reload the page')
        return
      }
      setStatus('disconnected')
      const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** (failures - 1), RECONNECT_MAX_DELAY_MS)
      retryTimer = setTimeout(connect, delay)
    }

    function handleEvent(event: ServerEvent) {
      if (event.type === 'chat') {
        setMessages((current) => mergeMessages(current, [event.message]))
        return
      }
      if (event.type === 'error') {
        setNotice(event.message)
        return
      }
      setState((current) => (current ? applyEvent(current, event) : current))
    }

    async function catchUpMessages() {
      const snapshot = await fetchGame(code).catch(() => null)
      if (!cancelled && snapshot) setMessages((current) => mergeMessages(current, snapshot.messages))
    }

    async function connect() {
      try {
        const snapshot = await loadGameSnapshot(code)
        if (cancelled) return
        setState(snapshot.state)
        setMessages((current) => mergeMessages(current, snapshot.messages))
        setMe(snapshot.me)

        const token = await getAccessToken()
        if (cancelled) return
        const socket = new WebSocket(gameSocketUrl(code), [WEBSOCKET_BEARER_PROTOCOL, token])
        socketRef.current = socket
        socket.onopen = () => {
          failures = 0
          setStatus('live')
          void catchUpMessages()
        }
        socket.onclose = () => {
          if (!cancelled) scheduleReconnect()
        }
        socket.onmessage = (message) => {
          const event = parseServerEvent(message.data)
          if (event) handleEvent(event)
        }
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status < HTTP_SERVER_ERROR) {
          fail(err.message)
          return
        }
        scheduleReconnect()
      }
    }

    void connect()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
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

  const start = useCallback(async () => {
    setNotice(null)
    try {
      const { state: startedState } = await startGame(code)
      setState(startedState)
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'Could not start the game')
    }
  }, [code])

  const stop = useCallback(async () => {
    setNotice(null)
    try {
      const { state: stoppedState } = await stopGame(code)
      setState(stoppedState)
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'Could not stop the game')
    }
  }, [code])

  const leave = useCallback(async () => {
    setNotice(null)
    try {
      await leaveGame(code)
      return true
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'Could not leave the game')
      return false
    }
  }, [code])

  return { state, messages, me, status, error, notice, send, start, stop, leave }
}
