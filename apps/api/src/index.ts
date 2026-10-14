import { serve } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { app } from './app.js'
import { env } from './env.js'

// Hosting proxies close WebSockets that stay silent for 60 seconds
const HEARTBEAT_INTERVAL_MS = 30_000

const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 })

setInterval(() => {
  for (const client of wss.clients) client.ping()
}, HEARTBEAT_INTERVAL_MS).unref()

serve({ fetch: app.fetch, port: env.PORT, websocket: { server: wss } })
