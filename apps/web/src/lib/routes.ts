export const ROUTES = {
  home: '/',
  auth: '/auth',
  play: '/play',
  game: '/game/:code',
} as const

export const gamePath = (code: string) => `/game/${code}`
