import { getConnInfo } from '@hono/node-server/conninfo'
import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { auth } from './auth.js'
import { env } from './env.js'
import { gamesRoutes } from './routes/games.js'
import { health } from './routes/health.js'
import { me } from './routes/me.js'

function withClientIp(c: Context): Request {
  const peer = getConnInfo(c).remote.address
  if (!peer) return c.req.raw
  const forwarded = env.TRUSTED_PROXIES.length > 0 ? c.req.header('x-forwarded-for') : undefined
  const headers = new Headers(c.req.raw.headers)
  headers.set('x-forwarded-for', forwarded ? `${forwarded}, ${peer}` : peer)
  return new Request(c.req.raw, { headers })
}

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
      onError: (c) => c.json({ error: 'Request too large' }, 413),
    }),
  )
  .on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(withClientIp(c)))
  .route('/api/health', health)
  .route('/api/me', me)
  .route('/api/games', gamesRoutes)
  .onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Internal error' }, 500)
  })

export type AppType = typeof app
