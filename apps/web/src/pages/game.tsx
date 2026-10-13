import { Link, Navigate, useParams } from 'react-router'
import { ChatPanel } from '@/components/game/chat-panel'
import { PlayerList } from '@/components/game/player-list'
import { Logo } from '@/components/landing/logo'
import { Button } from '@/components/ui/button'
import { useGameRoom, type RoomStatus } from '@/hooks/use-game-room'
import type { GameState } from '@/lib/game-types'
import { ROUTES } from '@/lib/routes'

const CONNECTION_NOTICE: Record<RoomStatus, string> = {
  loading: 'Connecting… messages will unlock once live.',
  disconnected: 'Connection lost, reconnecting…',
  live: '',
  error: '',
}

function statusLabel({ game }: GameState) {
  if (game.status === 'lobby') return 'Waiting for players'
  if (game.status === 'playing') return `Round ${game.round}: chat`
  if (game.status === 'voting') return `Round ${game.round}: vote for the AI`
  return game.winner === 'ais' ? 'The AIs win!' : 'The humans win!'
}

export function GamePage() {
  const { code } = useParams()
  if (!code) return <Navigate to={ROUTES.play} replace />
  return <GameRoom code={code.toUpperCase()} />
}

function GameRoom({ code }: { code: string }) {
  const { state, messages, me, status, error, notice, send } = useGameRoom(code)

  if (status === 'error') {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-nuit px-[clamp(16px,4vw,40px)] text-center">
        <h1 className="m-0 font-display text-4xl font-bold">Cannot open game {code}</h1>
        <p role="alert" className="m-0 text-lg text-rose">
          {error}
        </p>
        <Button asChild>
          <Link to={ROUTES.play}>Back</Link>
        </Button>
      </main>
    )
  }

  if (!state) return <main className="min-h-svh bg-nuit" aria-busy="true" />

  const myPlayer = state.players.find((player) => player.id === me)
  const live = status === 'live'
  const canChat = live && state.game.status !== 'finished' && !myPlayer?.isEliminated
  const canVote = live && state.game.status === 'voting' && !myPlayer?.isEliminated

  return (
    <div className="min-h-svh bg-nuit px-[clamp(16px,4vw,40px)] py-5">
      <header className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 pb-6">
        <Link to={ROUTES.play}>
          <Logo className="text-[28px]" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{statusLabel(state)}</span>
          <span className="rounded-full bg-ink px-4 py-1.5 font-display text-lg font-semibold tracking-[4px]">
            {state.game.code}
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-[clamp(24px,4vw,48px)]">
        <section className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <h2 className="m-0 font-display text-2xl font-bold">
            Players {state.players.length}/{state.maxPlayers}
          </h2>
          <PlayerList
            players={state.players}
            meId={me}
            votedPlayerIds={state.votedPlayerIds}
            canVote={canVote}
            onVote={(targetId) => send({ type: 'vote', targetId })}
          />
        </section>

        <section className="flex min-w-0 flex-[2_1_420px] flex-col gap-3">
          <ChatPanel
            messages={messages}
            players={state.players}
            meId={me}
            canSend={canChat}
            onSend={(content) => send({ type: 'chat', content })}
          />
          {!live && <p className="m-0 text-sm opacity-80">{CONNECTION_NOTICE[status]}</p>}
          {notice && (
            <p role="alert" className="m-0 font-semibold text-rose">
              {notice}
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
