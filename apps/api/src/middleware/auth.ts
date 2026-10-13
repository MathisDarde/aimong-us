import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { auth } from '../auth.js'

export type AuthUser = { id: string; name: string }

export type AuthEnv = {
  Variables: {
    user: AuthUser
  }
}

const BEARER_PREFIX = 'Bearer '
const WEBSOCKET_BEARER_PROTOCOL = 'bearer'

function extractToken(c: Context): string | undefined {
  const authorization = c.req.header('authorization')
  if (authorization?.startsWith(BEARER_PREFIX)) return authorization.slice(BEARER_PREFIX.length)

  // Browsers cannot set headers on a WebSocket, so the token travels as a subprotocol
  if (c.req.header('upgrade')?.toLowerCase() !== 'websocket') return undefined
  const [scheme, token] = (c.req.header('sec-websocket-protocol') ?? '')
    .split(',')
    .map((part) => part.trim())
  return scheme === WEBSOCKET_BEARER_PROTOCOL ? token : undefined
}

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const token = extractToken(c)
  const verified = token ? await auth.api.verifyJWT({ body: { token } }) : null
  const payload = verified?.payload
  if (!payload?.sub || typeof payload.name !== 'string') {
    return c.json({ error: 'Not authenticated' }, 401)
  }
  c.set('user', { id: payload.sub, name: payload.name })
  await next()
})
