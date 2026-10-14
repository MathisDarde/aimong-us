import { randomInt } from 'node:crypto'
import { MAX_AIS, MAX_PLAYERS, MIN_AIS, MIN_PLAYERS } from './db/schema.js'

const AI_NICKNAMES = [
  'Alex',
  'Sam',
  'Jordan',
  'Robin',
  'Charlie',
  'Morgan',
  'Casey',
  'Riley',
  'Jamie',
  'Taylor',
  'Quinn',
  'Avery',
]

export function drawAiCount(humanCount: number): number {
  const min = Math.max(MIN_AIS, MIN_PLAYERS - humanCount)
  const max = Math.min(MAX_AIS, MAX_PLAYERS - humanCount)
  if (min > max) throw new Error(`No valid AI count for ${humanCount} humans`)
  return randomInt(min, max + 1)
}

export function pickAiNicknames(count: number, takenNicknames: string[]): string[] {
  const taken = new Set(takenNicknames.map((nickname) => nickname.toLowerCase()))
  const available = AI_NICKNAMES.filter((nickname) => !taken.has(nickname.toLowerCase()))
  const picked: string[] = []
  while (picked.length < count && available.length > 0) {
    picked.push(...available.splice(randomInt(available.length), 1))
  }
  return picked
}
