import { Hono } from 'hono'
import { requireAuth, type AuthEnv } from '../middleware/auth.js'

export const me = new Hono<AuthEnv>().use(requireAuth).get('/', (c) => {
  const { id, name, email, image, createdAt } = c.get('user')
  return c.json({ id, name, email, image, createdAt })
})
