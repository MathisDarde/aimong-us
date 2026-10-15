const STYLE_SAMPLE_SIZE = 12
const STYLE_EXAMPLES = 8
const LENGTH_SAMPLE_SIZE = 6
const MIN_RANGE_RATIO = 0.6
const MAX_RANGE_RATIO = 1.4
const OVERSHOOT_RATIO = 1.5
const HIGH_RATE = 0.7
const LOW_RATE = 0.3

const FINAL_PUNCTUATION = /[.!?…]$/u
const LOWERCASE_START = /^\p{Ll}/u
const EMOJI = /\p{Extended_Pictographic}/u
const SENTENCE_END = /(?<=[.!?…])\s+/u

export type StyleProfile = {
  targetWords: number
  minWords: number
  maxWords: number
  lowercaseStartRate: number
  finalPunctuationRate: number
  emojiRate: number
  examples: string[]
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function rate(texts: string[], pattern: RegExp): number {
  return texts.filter((text) => pattern.test(text)).length / texts.length
}

export function profileStyle(humanMessages: string[]): StyleProfile | null {
  const sample = humanMessages.slice(-STYLE_SAMPLE_SIZE)
  if (sample.length === 0) return null

  // The latest messages weigh more: people adapt their length to the current question.
  const targetWords = Math.max(1, Math.round(median(sample.slice(-LENGTH_SAMPLE_SIZE).map(wordCount))))
  return {
    targetWords,
    minWords: Math.max(1, Math.floor(targetWords * MIN_RANGE_RATIO)),
    maxWords: Math.ceil(targetWords * MAX_RANGE_RATIO) + 1,
    lowercaseStartRate: rate(sample, LOWERCASE_START),
    finalPunctuationRate: rate(sample, FINAL_PUNCTUATION),
    emojiRate: rate(sample, EMOJI),
    examples: sample.slice(-STYLE_EXAMPLES),
  }
}

function habit(value: number, often: string, rarely: string): string | null {
  if (value >= HIGH_RATE) return often
  if (value <= LOW_RATE) return rarely
  return null
}

export function describeStyle(profile: StyleProfile): string {
  const habits = [
    habit(profile.lowercaseStartRate, 'they start in lowercase', 'they start with a capital letter'),
    habit(profile.finalPunctuationRate, 'they end with punctuation', 'they leave out the final punctuation'),
    habit(profile.emojiRate, 'they use emojis', 'they almost never use emojis'),
  ].filter((value): value is string => value !== null)

  return [
    `- Length: the human players currently write about ${profile.targetWords} words per message. Write between ${profile.minWords} and ${profile.maxWords} words. This matters more than anything else.`,
    habits.length > 0 ? `- Most of the time ${habits.join(', ')}. Do the same.` : null,
    '- Recent messages from the human players, to imitate in form only (length, level of detail, abbreviations, verbal tics, slang, spelling mistakes, capitals, punctuation, emojis), never in content:',
    ...profile.examples.map((example) => `  > ${example}`),
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}

export function capLength(reply: string, profile: StyleProfile | null): string {
  if (!profile) return reply
  const limit = Math.ceil(profile.maxWords * OVERSHOOT_RATIO)
  if (wordCount(reply) <= limit) return reply

  const sentences = reply.split(SENTENCE_END)
  let kept = sentences[0]
  for (const sentence of sentences.slice(1)) {
    const next = `${kept} ${sentence}`
    if (wordCount(next) > limit) break
    kept = next
  }
  return kept
}
