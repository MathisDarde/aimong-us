export const GAME_CODE_LENGTH = 6
export const GAME_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function sanitizeGameCode(input: string) {
  return [...input.toUpperCase()]
    .filter((char) => GAME_CODE_ALPHABET.includes(char))
    .join('')
    .slice(0, GAME_CODE_LENGTH)
}
