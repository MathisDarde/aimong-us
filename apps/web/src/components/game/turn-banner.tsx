import { cn } from '@/lib/utils'

type TurnBannerProps = {
  myTurn: boolean
  speakerName: string | null
  secondsLeft: number | null
}

export function TurnBanner({ myTurn, speakerName, secondsLeft }: TurnBannerProps) {
  if (!speakerName) return null

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-between gap-3 rounded-[18px] border-3 border-ink px-4 py-2 font-display text-lg font-semibold text-ink shadow-hard-3',
        myTurn ? 'bg-menthe' : 'bg-jaune',
      )}
    >
      <span>{myTurn ? 'Your turn, answer now!' : `${speakerName} is answering…`}</span>
      {secondsLeft !== null && <span aria-label={`${secondsLeft} seconds left`}>{secondsLeft}s</span>}
    </div>
  )
}
