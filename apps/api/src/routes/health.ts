import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/index.js'

export const health = new Hono().get('/', async (c) => {
  let dbOk = false
  try {
    await db.execute(sql`select 1`)
    dbOk = true
  } catch {
    dbOk = false
  }
  return c.json({ status: 'ok', db: dbOk })
})
