import { randomInt } from 'node:crypto'

const TYPO_CHANCE_PERCENT = 40
const FINAL_PERIOD_REMOVAL_PERCENT = 85
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

export function humanize(reply: string): string {
  let text = reply
  if (randomInt(PERCENT) < FINAL_PERIOD_REMOVAL_PERCENT) text = text.replace(FINAL_PERIOD, '')
  if (randomInt(PERCENT) < TYPO_CHANCE_PERCENT) text = introduceTypo(text)
  return text
}
