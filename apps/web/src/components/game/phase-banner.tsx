import type { GameState } from '@/lib/game-types'
import { cn } from '@/lib/utils'

type PhaseBannerProps = {
  state: GameState
  meId: string | null
  secondsLeft: number | null
}

type Banner = { text: string; tone: 'mine' | 'info' }

const TONE_CLASSES: Record<Banner['tone'], string> = {
  mine: 'bg-menthe',
  info: 'bg-jaune',
}

function nicknameOf(state: GameState, playerId: string | null) {
  return state.players.find((player) => player.id === playerId)?.nickname ?? 'Someone'
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
  return null
}

export function PhaseBanner({ state, meId, secondsLeft }: PhaseBannerProps) {
  const banner = describe(state, meId)
  if (!banner) return null

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-between gap-3 rounded-[18px] border-3 border-ink px-4 py-2 font-display text-lg font-semibold text-ink shadow-hard-3',
        TONE_CLASSES[banner.tone],
      )}
    >
      <span>{banner.text}</span>
      {secondsLeft !== null && <span aria-label={`${secondsLeft} seconds left`}>{secondsLeft}s</span>}
    </div>
  )
}
