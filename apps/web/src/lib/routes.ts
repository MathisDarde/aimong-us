export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  play: '/play',
  game: '/game/:code',
} as const

export const gamePath = (code: string) => `/game/${code}`
