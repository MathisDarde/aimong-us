import { randomInt } from 'node:crypto'

const THEMES = [
  'Your worst cafeteria meal',
  'Your most useless talent',
  'The weirdest thing you did at 3 a.m.',
  'A smell that brings back memories',
  'Your most embarrassing autocorrect fail',
  'What you would do with one day of invisibility',
  'The worst gift you ever received',
  'A lie you told as a kid and still believe',
  'Your guilty pleasure song',
  'The strangest dream you remember',
  'Your worst haircut story',
  'A food combination people judge you for',
  'The most awkward silence you lived through',
  'Something you pretend to like',
  'Your most chaotic group chat moment',
  'The dumbest way you got hurt',
  'A rule you secretly break every day',
  'Your worst date or hangout',
  'What you would put in a time capsule',
  'The most useless app on your phone',
]

export function pickTheme(previous: string | null): string {
  const choices = THEMES.filter((theme) => theme !== previous)
  return choices[randomInt(choices.length)]
}
