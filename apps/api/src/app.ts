import { swaggerUI } from '@hono/swagger-ui'
import { getConnInfo } from '@hono/node-server/conninfo'
import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { auth } from './auth.js'
import { env } from './env.js'
import { logError } from './logger.js'
import { accessLog } from './middleware/access-log.js'
import { webApp } from './middleware/web-app.js'
import { openApiDocument } from './openapi.js'
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
  .use('*', requestId({ headerName: '' }))
  .use('*', accessLog)
  .use('*', secureHeaders())
  .use('*', webApp)
  .use(
    '/api/*',
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
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
  .get('/api/openapi.json', (c) => c.json(openApiDocument))
  .get('/api/docs', swaggerUI({ url: '/api/openapi.json' }))
  .route('/api/health', health)
  .route('/api/me', me)
  .route('/api/games', gamesRoutes)
  .notFound((c) => c.json({ error: 'Not found' }, 404))
  .onError((err, c) => {
    const id = c.get('requestId')
    logError('unhandled error', err, { requestId: id, method: c.req.method, path: c.req.path })
    return c.json({ error: 'Internal error', requestId: id }, 500)
  })

export type AppType = typeof app
