import { useState } from 'react'
import { RevealAvatar } from '@/components/game/reveal-avatar'
import { Button } from '@/components/ui/button'
import type { GameState, PublicPlayer, Role } from '@/lib/game-types'
import { cn } from '@/lib/utils'

type GameOverPanelProps = {
  state: GameState
  meId: string | null
  canPlayAgain: boolean
  onPlayAgain: () => Promise<void>
}

type Winner = Role | 'none'

const WINNER_STYLE: Record<Winner, { title: string; classes: string }> = {
  human: { title: 'The humans win!', classes: 'bg-menthe' },
  ai: { title: 'The AIs win!', classes: 'bg-rose' },
  none: { title: 'Game stopped', classes: 'bg-jaune' },
}

const TEAM_TITLE: Record<Role, string> = { ai: 'The AIs', human: 'The humans' }

const AVATAR_SIZE = 72
const REVEAL_STAGGER_MS = 250

function toWinner(winner: string | null): Winner {
  if (winner === 'humans') return 'human'
  if (winner === 'ais') return 'ai'
  return 'none'
}

function verdict(winner: Winner, myRole: Role | null) {
  if (winner === 'none') return 'The host ended the game early. Here is who was who.'
  if (!myRole) return 'Here is who was who.'
  return myRole === winner ? 'Your team won. Nicely played!' : 'Your team lost. Better luck next time!'
}

type TeamProps = {
  role: Role
  players: PublicPlayer[]
  allPlayers: PublicPlayer[]
  meId: string | null
  winner: Winner
}

function Team({ role, players, allPlayers, meId, winner }: TeamProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-[1_1_280px] flex-col gap-3 rounded-[22px] border-4 border-ink bg-nuit p-4',
        winner === role && 'shadow-hard-6',
        winner !== 'none' && winner !== role && 'opacity-80',
      )}
    >
      <h3
        className={cn(
          'm-0 flex items-center gap-2 font-display text-2xl font-bold',
          role === 'ai' ? 'text-menthe' : 'text-rose',
        )}
      >
        {TEAM_TITLE[role]}
        {winner === role && (
          <span className="rounded-full border-3 border-ink bg-jaune px-2 text-sm text-ink">Winners</span>
        )}
      </h3>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3 p-0">
        {players.map((player) => {
          const index = allPlayers.indexOf(player)
          return (
            <li key={player.id} className="flex flex-col items-center gap-1 text-center">
              <RevealAvatar
                index={index}
                role={player.role}
                size={AVATAR_SIZE}
                delayMs={(index + 1) * REVEAL_STAGGER_MS}
              />
              <span className="max-w-full truncate font-display font-semibold">
                {player.nickname}
                {player.id === meId && ' (you)'}
              </span>
              {player.isEliminated && <span className="text-xs opacity-70">Eliminated</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function GameOverPanel({ state, meId, canPlayAgain, onPlayAgain }: GameOverPanelProps) {
  const [requesting, setRequesting] = useState(false)
  const winner = toWinner(state.game.winner)
  const { title, classes } = WINNER_STYLE[winner]
  const myRole = state.players.find((player) => player.id === meId)?.role ?? null
  const ais = state.players.filter((player) => player.role === 'ai')
  const humans = state.players.filter((player) => player.role !== 'ai')

  async function handlePlayAgain() {
    setRequesting(true)
    await onPlayAgain()
    setRequesting(false)
  }

  return (
    <section
      aria-labelledby="game-over-title"
      className="flex flex-col gap-5 rounded-[28px] border-4 border-ink bg-nuit-400 p-[clamp(16px,3vw,28px)] shadow-hard-8 animate-in fade-in zoom-in-95"
    >
      <div
        className={cn(
          '-rotate-1 self-center rounded-[20px] border-4 border-ink px-[clamp(20px,4vw,40px)] py-3 text-center text-ink shadow-hard-6',
          classes,
        )}
      >
        <span className="font-display text-sm font-bold tracking-[2px]">GAME OVER</span>
        <h2 id="game-over-title" className="m-0 font-display text-[clamp(36px,6vw,64px)] leading-none font-bold">
          {title}
        </h2>
      </div>
      <p role="status" className="m-0 text-center text-lg font-semibold">
        {verdict(winner, myRole)}
      </p>

      <div className="flex flex-wrap gap-4">
        <Team role="ai" players={ais} allPlayers={state.players} meId={meId} winner={winner} />
        <Team role="human" players={humans} allPlayers={state.players} meId={meId} winner={winner} />
      </div>

      <Button
        size="lg"
        className="self-center"
        disabled={!canPlayAgain || requesting}
        onClick={handlePlayAgain}
      >
        {requesting ? 'Setting up the rematch…' : 'Play again'}
      </Button>
    </section>
  )
}
