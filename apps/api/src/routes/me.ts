import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { user } from '../db/schema.js'
import { requireAuth, type AuthEnv } from '../middleware/auth.js'

export const me = new Hono<AuthEnv>().use(requireAuth).get('/', async (c) => {
  const found = await db.query.user.findFirst({
    where: eq(user.id, c.get('user').id),
    columns: { id: true, name: true, email: true, image: true, createdAt: true },
  })
  if (!found) return c.json({ error: 'Not authenticated' }, 401)
  return c.json(found)
})
