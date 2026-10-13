import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { env } from '../env.js'
import * as schema from './schema.js'

if (!env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL manquant : copie apps/api/.env.example vers apps/api/.env')
}

const sql = neon(env.DATABASE_URL || 'postgresql://placeholder@localhost/placeholder')

export const db = drizzle(sql, { schema })
