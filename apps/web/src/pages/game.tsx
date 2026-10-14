import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ChatPanel } from '@/components/game/chat-panel'
import { PlayerList } from '@/components/game/player-list'
import { PhaseBanner } from '@/components/game/phase-banner'
import { ThemeCard } from '@/components/game/theme-card'
import { VotePanel } from '@/components/game/vote-panel'
import { Logo } from '@/components/landing/logo'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/hooks/use-countdown'
import { useGameRoom, type RoomStatus } from '@/hooks/use-game-room'
import type { GameState, GameStatus } from '@/lib/game-types'
import { ROUTES } from '@/lib/routes'

const CONNECTION_NOTICE: Record<RoomStatus, string> = {
  loading: 'Connecting… messages will unlock once live.',
  disconnected: 'Connection lost, reconnecting…',
  live: '',
  error: '',
}

const STOP_CONFIRMATION = 'Stop the game for everyone?'
const HOST_LEAVE_CONFIRMATION = 'You are the host: leaving will close the room for everyone. Leave?'

function isChatOpen(status: GameStatus, myTurn: boolean) {
  if (status === 'playing') return myTurn
  return status === 'lobby' || status === 'voting'
}

function statusLabel({ game }: GameState) {
  if (game.status === 'lobby') return 'Waiting for players'
  if (game.status === 'playing') return `Round ${game.round}: take turns`
  if (game.status === 'voting') return `Round ${game.round}: vote for the AI`
  if (game.status === 'results') return `Round ${game.round}: results`
  if (game.winner === 'ais') return 'The AIs win!'
  if (game.winner === 'humans') return 'The humans win!'
  return 'Game stopped by the host'
}

export function GamePage() {
  const { code } = useParams()
  if (!code) return <Navigate to={ROUTES.play} replace />
  return <GameRoom code={code.toUpperCase()} />
}

function GameRoom({ code }: { code: string }) {
  const { state, messages, me, status, error, notice, typingIds, send, start, stop, leave } =
    useGameRoom(code)
  const navigate = useNavigate()
  const secondsLeft = useCountdown(
    state?.turn.endsInMs ?? null,
    `${state?.game.status}:${state?.game.round}:${state?.turn.index}`,
  )

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
  const speakerId = state.turn.playerId
  const myTurn = speakerId !== null && speakerId === me
  const chatOpen = isChatOpen(state.game.status, myTurn)
  const canChat = live && chatOpen && !myPlayer?.isEliminated
  const canReact = live && state.game.status !== 'finished' && !myPlayer?.isEliminated
  const typingNames = state.players
    .filter((player) => typingIds.includes(player.id) && player.id !== me)
    .map((player) => player.nickname)
  const isVoting = state.game.status === 'voting'
  const canVote = live && isVoting && !myPlayer?.isEliminated
  const isHost = state.hostId === me
  const isHostInLobby = state.game.status === 'lobby' && isHost
  const canStop = isHost && state.game.status !== 'finished'
  const hasEnoughPlayers = state.players.length >= state.minPlayersToStart

  async function handleLeave() {
    if (isHostInLobby && !window.confirm(HOST_LEAVE_CONFIRMATION)) return
    if (await leave()) void navigate(ROUTES.play)
  }

  function handleStop() {
    if (window.confirm(STOP_CONFIRMATION)) void stop()
  }

  return (
    <div className="min-h-svh bg-nuit px-[clamp(16px,4vw,40px)] py-5">
      <header className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 pb-6">
        <Link to={ROUTES.play}>
          <Logo className="text-[28px]" />
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold">{statusLabel(state)}</span>
          <span className="rounded-full bg-ink px-4 py-1.5 font-display text-lg font-semibold tracking-[4px]">
            {state.game.code}
          </span>
          {canStop && (
            <Button variant="accent" size="sm" onClick={handleStop} disabled={!live}>
              Stop game
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleLeave}>
            Leave
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-[clamp(24px,4vw,48px)]">
        {isVoting && (
          <div className="basis-full">
            <VotePanel
              players={state.players}
              meId={me}
              votedPlayerIds={state.votedPlayerIds}
              secondsLeft={secondsLeft}
              canVote={canVote}
              eliminated={myPlayer?.isEliminated ?? false}
              onVote={(targetId) => send({ type: 'vote', targetId })}
            />
          </div>
        )}
        <section className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <h2 className="m-0 font-display text-2xl font-bold">
            Players {state.players.length}/{state.maxPlayers}
          </h2>
          <PlayerList
            players={state.players}
            meId={me}
            votedPlayerIds={state.votedPlayerIds}
            speakerId={speakerId}
          />
          {isHostInLobby && (
            <div className="flex flex-col gap-2">
              <Button onClick={start} disabled={!live || !hasEnoughPlayers}>
                Start game
              </Button>
              {!hasEnoughPlayers && (
                <p className="m-0 text-sm opacity-80">
                  Waiting for at least {state.minPlayersToStart} players.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-[2_1_420px] flex-col gap-3">
          {state.theme && state.game.status !== 'finished' && (
            <ThemeCard theme={state.theme} round={state.game.round} maxRounds={state.maxRounds} />
          )}
          {!isVoting && <PhaseBanner state={state} meId={me} secondsLeft={secondsLeft} />}
          <ChatPanel
            messages={messages}
            players={state.players}
            meId={me}
            canSend={canChat}
            canReact={canReact}
            closedReason={state.game.status === 'playing' ? 'Wait for your turn' : 'Chat is closed'}
            typingNames={typingNames}
            onSend={(content) => send({ type: 'chat', content })}
            onTyping={() => send({ type: 'typing' })}
            onReact={(messageId, emoji) => send({ type: 'react', messageId, emoji })}
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
