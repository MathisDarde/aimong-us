import { createMiddleware } from 'hono/factory'
import { auth, type AuthSession, type AuthUser } from '../auth.js'

export type AuthEnv = {
  Variables: {
    user: AuthUser
    session: AuthSession
  }
}

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!result) return c.json({ error: 'Non authentifié' }, 401)
  c.set('user', result.user)
  c.set('session', result.session)
  await next()
})
