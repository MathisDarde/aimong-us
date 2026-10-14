import { randomInt } from 'node:crypto'

const PLAYER_NICKNAMES = [
  'Alex', 'Sam', 'Jordan', 'Robin', 'Charlie', 'Morgan',
  'Casey', 'Riley', 'Jamie', 'Taylor', 'Quinn', 'Avery',
]

export function pickNickname(takenNicknames: string[]): string | undefined {
  const taken = new Set(takenNicknames.map((nickname) => nickname.toLowerCase()))
  const available = PLAYER_NICKNAMES.filter((nickname) => !taken.has(nickname.toLowerCase()))
  if (available.length === 0) return undefined
  return available[randomInt(available.length)]
}
