import { serve } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { app } from './app.js'
import { env } from './env.js'

const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 })

serve({ fetch: app.fetch, port: env.PORT, websocket: { server: wss } }, (info) => {
  console.log(`🚀 API Aimong Us sur http://localhost:${info.port}`)
})
