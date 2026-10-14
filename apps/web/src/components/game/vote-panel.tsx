import { useState } from 'react'
import { Avatar } from '@/components/avatar'
import type { PublicPlayer } from '@/lib/game-types'
import { playerLook } from '@/lib/player-look'
import { cn } from '@/lib/utils'

type VotePanelProps = {
  players: PublicPlayer[]
  meId: string | null
  votedPlayerIds: string[]
  secondsLeft: number | null
  canVote: boolean
  eliminated: boolean
  onVote: (targetId: string) => void
}

const URGENT_SECONDS = 5

function heading(eliminated: boolean, hasVoted: boolean) {
  if (eliminated) return { title: 'The vote is on', hint: 'You are out, watch the others decide.' }
  if (hasVoted) return { title: 'Vote locked in', hint: 'Waiting for the other players…' }
  return { title: 'Time to vote!', hint: 'Who is the AI? Pick one player before time runs out.' }
}

export function VotePanel({
  players,
  meId,
  votedPlayerIds,
  secondsLeft,
  canVote,
  eliminated,
  onVote,
}: VotePanelProps) {
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null)
  if (totalSeconds === null && secondsLeft !== null) setTotalSeconds(secondsLeft)

  const hasVoted = meId !== null && votedPlayerIds.includes(meId)
  const candidates = players.filter((player) => !player.isEliminated && player.id !== meId)
  const activeCount = players.filter((player) => !player.isEliminated).length
  const votedCount = Math.min(votedPlayerIds.length, activeCount)
  const { title, hint } = heading(eliminated, hasVoted)
  const progress = totalSeconds && secondsLeft !== null ? secondsLeft / totalSeconds : 1
  const urgent = secondsLeft !== null && secondsLeft <= URGENT_SECONDS

  function handleVote(targetId: string) {
    setChosenId(targetId)
    onVote(targetId)
  }

  return (
    <section
      aria-labelledby="vote-title"
      className="flex flex-col gap-4 rounded-[28px] border-4 border-ink bg-nuit-400 p-[clamp(16px,3vw,28px)] shadow-hard-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="vote-title" className="m-0 font-display text-[clamp(28px,4vw,40px)] font-bold">
            {title}
          </h2>
          <p role="status" className="m-0 text-base opacity-90">
            {hint}
          </p>
        </div>
        {secondsLeft !== null && (
          <span
            aria-label={`${secondsLeft} seconds left`}
            className={cn(
              'rounded-full border-4 border-ink px-5 py-1 font-display text-3xl font-bold text-ink',
              urgent ? 'animate-pulse bg-rose' : 'bg-jaune',
            )}
          >
            {secondsLeft}s
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-label="Time left to vote"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-3 overflow-hidden rounded-full border-3 border-ink bg-ink"
      >
        <div
          className={cn('h-full transition-[width] duration-300 ease-linear', urgent ? 'bg-rose' : 'bg-jaune')}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {!eliminated && (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3 p-0">
          {candidates.map((candidate) => {
            const { color, disguise } = playerLook(players.indexOf(candidate))
            const chosen = candidate.id === chosenId
            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  disabled={!canVote || hasVoted}
                  aria-pressed={chosen}
                  aria-label={`Vote for ${candidate.nickname}`}
                  onClick={() => handleVote(candidate.id)}
                  className={cn(
                    'flex w-full cursor-pointer flex-col items-center gap-2 rounded-[20px] border-4 border-ink px-3 py-3 font-display text-ink shadow-hard-4 transition-transform enabled:hover:-translate-y-1 enabled:active:translate-y-0.5 disabled:cursor-not-allowed',
                    chosen ? 'bg-menthe' : 'bg-creme',
                    hasVoted && !chosen && 'opacity-50',
                  )}
                >
                  <Avatar color={color} disguise={disguise} size={56} />
                  <span className="max-w-full truncate text-lg font-semibold">{candidate.nickname}</span>
                  <span className="rounded-full border-3 border-ink bg-rose px-3 text-sm font-bold">
                    {chosen ? 'Your vote' : hasVoted ? 'Locked' : 'Vote'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="m-0 text-sm font-semibold opacity-80">
        {votedCount}/{activeCount} players have voted
      </p>
    </section>
  )
}
