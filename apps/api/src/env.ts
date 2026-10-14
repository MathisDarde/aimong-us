import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

const isProduction = process.env.NODE_ENV === 'production'
const BETTER_AUTH_SECRET = required('BETTER_AUTH_SECRET')

if (BETTER_AUTH_SECRET.length < 32) {
  throw new Error('BETTER_AUTH_SECRET must be at least 32 characters long')
}

export const env = {
  isProduction,
  DATABASE_URL: required('DATABASE_URL'),
  PORT: Number(process.env.PORT ?? 3000),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  BETTER_AUTH_SECRET,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || null,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || null,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  TRUSTED_PROXIES: (process.env.TRUSTED_PROXIES ?? '')
    .split(',')
    .map((proxy) => proxy.trim())
    .filter(Boolean),
}
