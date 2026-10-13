import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { auth } from './auth.js'
import { env } from './env.js'
import { gamesRoutes } from './routes/games.js'
import { health } from './routes/health.js'
import { me } from './routes/me.js'

export const app = new Hono()
  .use('*', logger())
  .use('*', secureHeaders())
  .use(
    '/api/*',
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  )
  .use(
    '/api/*',
    bodyLimit({
      maxSize: 32 * 1024,
      onError: (c) => c.json({ error: 'Requête trop volumineuse' }, 413),
    }),
  )
  .on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))
  .route('/api/health', health)
  .route('/api/me', me)
  .route('/api/games', gamesRoutes)
  .onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Erreur interne' }, 500)
  })

export type AppType = typeof app
