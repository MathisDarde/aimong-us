import { db } from './db/index.js'
import { messages } from './db/schema.js'
import { broadcast } from './rooms.js'

export async function postMessage(gameId: string, playerId: string, content: string) {
  const [message] = await db
    .insert(messages)
    .values({ gameId, playerId, content })
    .returning({
      id: messages.id,
      playerId: messages.playerId,
      content: messages.content,
      createdAt: messages.createdAt,
    })
  broadcast(gameId, { type: 'chat', message })
}
