import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { env } from './env.js'
import { health } from './routes/health.js'

export const app = new Hono()
  .use('*', logger())
  .use('/api/*', cors({ origin: env.WEB_ORIGIN }))
  .route('/api/health', health)

export type AppType = typeof app
