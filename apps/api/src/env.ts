import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`)
  return value
}

const isProduction = process.env.NODE_ENV === 'production'
const BETTER_AUTH_SECRET = required('BETTER_AUTH_SECRET')

if (BETTER_AUTH_SECRET.length < 32) {
  throw new Error('BETTER_AUTH_SECRET doit faire au moins 32 caractères')
}

export const env = {
  isProduction,
  DATABASE_URL: required('DATABASE_URL'),
  PORT: Number(process.env.PORT ?? 3000),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:5173',
}
