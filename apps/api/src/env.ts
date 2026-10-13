import 'dotenv/config'

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  PORT: Number(process.env.PORT ?? 3000),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
}
