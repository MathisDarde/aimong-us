import type { GameState } from '@/lib/game-types'
import { cn } from '@/lib/utils'

type PhaseBannerProps = {
  state: GameState
  meId: string | null
  secondsLeft: number | null
}

type Banner = { text: string; tone: 'mine' | 'info' | 'bad' }

const TONE_CLASSES: Record<Banner['tone'], string> = {
  mine: 'bg-menthe',
  info: 'bg-jaune',
  bad: 'bg-rose',
}

function nicknameOf(state: GameState, playerId: string | null) {
  return state.players.find((player) => player.id === playerId)?.nickname ?? 'Someone'
}

function describeResult(state: GameState): Banner {
  const { lastResult } = state
  if (!lastResult?.eliminatedId) return { text: 'Tie: nobody is eliminated', tone: 'info' }

  const name = nicknameOf(state, lastResult.eliminatedId)
  if (lastResult.role === 'ai') return { text: `${name} was an AI. Mask off!`, tone: 'mine' }
  return { text: `${name} was human… oops`, tone: 'bad' }
}

function describeFinish(state: GameState): Banner {
  if (state.game.winner === 'humans') return { text: 'The humans win!', tone: 'mine' }
  if (state.game.winner === 'ais') return { text: 'The AIs win!', tone: 'bad' }
  return { text: 'Game stopped by the host', tone: 'info' }
}

function describe(state: GameState, meId: string | null): Banner | null {
  const { status } = state.game
  const eliminated = state.players.find((player) => player.id === meId)?.isEliminated

  if (status === 'playing') {
    const speakerId = state.turn.playerId
    if (speakerId === meId) return { text: 'Your turn, answer now!', tone: 'mine' }
    return { text: `${nicknameOf(state, speakerId)} is answering…`, tone: 'info' }
  }
  if (status === 'voting') {
    return { text: eliminated ? 'Watching the vote' : 'Vote for the AI!', tone: 'info' }
  }
  if (status === 'results') return describeResult(state)
  if (status === 'finished') return describeFinish(state)
  return null
}

export function PhaseBanner({ state, meId, secondsLeft }: PhaseBannerProps) {
  const banner = describe(state, meId)
  if (!banner) return null

  const showCountdown = secondsLeft !== null && state.game.status !== 'finished'
  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-between gap-3 rounded-[18px] border-3 border-ink px-4 py-2 font-display text-lg font-semibold text-ink shadow-hard-3',
        TONE_CLASSES[banner.tone],
      )}
    >
      <span>{banner.text}</span>
      {showCountdown && <span aria-label={`${secondsLeft} seconds left`}>{secondsLeft}s</span>}
    </div>
  )
}
