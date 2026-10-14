export const TURN_DURATION_MS = 30_000
export const VOTE_DURATION_MS = 15_000
export const RESULTS_DURATION_MS = 6_000
export const MAX_ROUNDS = 5

export type Winner = 'humans' | 'ais'

export function decideWinner(counts: {
  aliveAis: number
  aliveHumans: number
  round: number
}): Winner | null {
  if (counts.aliveAis === 0) return 'humans'
  if (counts.aliveAis >= counts.aliveHumans) return 'ais'
  if (counts.round >= MAX_ROUNDS) return 'ais'
  return null
}

export function pickEliminated(targetIds: string[]): string | null {
  const tally = new Map<string, number>()
  for (const targetId of targetIds) tally.set(targetId, (tally.get(targetId) ?? 0) + 1)

  const top = Math.max(0, ...tally.values())
  const leaders = [...tally].filter(([, count]) => count === top).map(([targetId]) => targetId)
  return leaders.length === 1 ? leaders[0] : null
}
