type ThemeCardProps = {
  theme: string
  round: number
  maxRounds: number
}

export function ThemeCard({ theme, round, maxRounds }: ThemeCardProps) {
  return (
    <div className="-rotate-[1deg] self-start rounded-[14px] border-3 border-ink bg-jaune px-4 py-2.5 text-ink shadow-hard-4">
      <div className="text-xs font-bold tracking-[1.5px]">
        ROUND {round}/{maxRounds} · THEME
      </div>
      <div className="font-display text-[22px] font-bold">{theme}</div>
    </div>
  )
}
