import { Avatar } from '@/components/avatar'
import { RevealAvatar } from '@/components/game/reveal-avatar'
import { RoleStamp } from '@/components/game/role-stamp'
import type { GameState } from '@/lib/game-types'
import { cn } from '@/lib/utils'

type RoundResultPanelProps = {
  state: GameState
  secondsLeft: number | null
}

type Outcome = 'ai' | 'human' | 'tie'

const OUTCOME_CLASSES: Record<Outcome, string> = {
  ai: 'bg-menthe',
  human: 'bg-rose',
  tie: 'bg-jaune',
}

const AVATAR_SIZE = 120

function headline(outcome: Outcome, name: string) {
  if (outcome === 'ai') return { title: 'Mask off!', hint: `${name} was an AI. Well spotted.` }
  if (outcome === 'human') return { title: 'Oops…', hint: `${name} was a real human.` }
  return { title: 'Tie!', hint: 'The votes are split: nobody is eliminated this round.' }
}

export function RoundResultPanel({ state, secondsLeft }: RoundResultPanelProps) {
  const { lastResult, players } = state
  const eliminatedIndex = players.findIndex((player) => player.id === lastResult?.eliminatedId)
  const eliminated = players[eliminatedIndex]
  const role = lastResult?.role ?? null
  const outcome: Outcome = eliminated && role ? role : 'tie'
  const { title, hint } = headline(outcome, eliminated?.nickname ?? '')

  return (
    <section
      aria-labelledby="round-result-title"
      className={cn(
        'flex flex-wrap items-center gap-[clamp(16px,4vw,40px)] rounded-[28px] border-4 border-ink p-[clamp(16px,3vw,28px)] text-ink shadow-hard-8 animate-in fade-in zoom-in-95',
        OUTCOME_CLASSES[outcome],
      )}
    >
      <div className="flex shrink-0 flex-col items-center gap-2">
        {eliminated && role ? (
          <RevealAvatar key={eliminated.id} index={eliminatedIndex} role={role} size={AVATAR_SIZE} />
        ) : (
          <div className="flex -space-x-6">
            {players
              .filter((player) => !player.isEliminated)
              .slice(0, 3)
              .map((player) => (
                <Avatar key={player.id} disguise="bag" color="creme" size={AVATAR_SIZE / 2} />
              ))}
          </div>
        )}
        {eliminated && role && <RoleStamp role={role} className="border-ink bg-creme text-lg text-ink" />}
      </div>

      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
        <span className="font-display text-sm font-bold tracking-[2px]">ROUND {state.game.round} · RESULT</span>
        <h2 id="round-result-title" className="m-0 font-display text-[clamp(32px,5vw,56px)] leading-none font-bold">
          {title}
        </h2>
        <p role="status" className="m-0 text-lg font-semibold">
          {hint}
        </p>
      </div>

      {secondsLeft !== null && (
        <div className="flex shrink-0 flex-col items-center rounded-[18px] border-4 border-ink bg-creme px-4 py-2 font-display">
          <span className="text-xs font-bold tracking-[1.5px]">NEXT ROUND</span>
          <span aria-label={`Next round in ${secondsLeft} seconds`} className="text-3xl font-bold">
            {secondsLeft}s
          </span>
        </div>
      )}
    </section>
  )
}
