import { randomInt } from 'node:crypto'
import type { StyleProfile } from './chat-style.js'

const DEFAULT_TYPO_CHANCE_PERCENT = 40
const MIN_TYPO_CHANCE_PERCENT = 10
const MAX_TYPO_CHANCE_PERCENT = 55
const DEFAULT_FINAL_PERIOD_REMOVAL_PERCENT = 85
const PERCENT = 100
const MIN_WORD_LENGTH = 4

const FINAL_PERIOD = /(?<!\.)\.$/
const COMBINING_MARKS = /[̀-ͯ]/g

function swapNeighbours(word: string): string {
  const index = randomInt(1, word.length - 2)
  return word.slice(0, index) + word[index + 1] + word[index] + word.slice(index + 2)
}

function dropLetter(word: string): string {
  const index = randomInt(1, word.length - 1)
  return word.slice(0, index) + word.slice(index + 1)
}

function doubleLetter(word: string): string {
  const index = randomInt(1, word.length - 1)
  return word.slice(0, index) + word[index] + word.slice(index)
}

function dropAccents(word: string): string {
  const plain = word.normalize('NFD').replace(COMBINING_MARKS, '').normalize('NFC')
  return plain === word ? swapNeighbours(word) : plain
}

const TYPOS = [swapNeighbours, dropLetter, doubleLetter, dropAccents]

function introduceTypo(text: string): string {
  const words = [...text.matchAll(new RegExp(`\\p{L}{${MIN_WORD_LENGTH},}`, 'gu'))]
  if (words.length === 0) return text

  const word = words[randomInt(words.length)]
  const mistyped = TYPOS[randomInt(TYPOS.length)](word[0])
  return text.slice(0, word.index) + mistyped + text.slice(word.index + word[0].length)
}

function chance(percent: number): boolean {
  return randomInt(PERCENT) < percent
}

// Players who skip capitals and punctuation are also the ones who leave typos behind.
function typoChancePercent(profile: StyleProfile): number {
  const sloppiness = (profile.lowercaseStartRate + 1 - profile.finalPunctuationRate) / 2
  return MIN_TYPO_CHANCE_PERCENT + (MAX_TYPO_CHANCE_PERCENT - MIN_TYPO_CHANCE_PERCENT) * sloppiness
}

function matchCapital(text: string, profile: StyleProfile): string {
  const first = text.charAt(0)
  const lowercase = chance(profile.lowercaseStartRate * PERCENT)
  return (lowercase ? first.toLocaleLowerCase() : first.toLocaleUpperCase()) + text.slice(1)
}

export function humanize(reply: string, profile: StyleProfile | null): string {
  const periodRemovalPercent = profile
    ? (1 - profile.finalPunctuationRate) * PERCENT
    : DEFAULT_FINAL_PERIOD_REMOVAL_PERCENT
  const typoPercent = profile ? typoChancePercent(profile) : DEFAULT_TYPO_CHANCE_PERCENT

  let text = profile ? matchCapital(reply, profile) : reply
  if (chance(periodRemovalPercent)) text = text.replace(FINAL_PERIOD, '')
  if (chance(typoPercent)) text = introduceTypo(text)
  return text
}
