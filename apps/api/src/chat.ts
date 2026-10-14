import { db } from './db/index.js'
import { messages } from './db/schema.js'
import type { Game, Player } from './game-state.js'
import { logError } from './logger.js'
import { scheduleAiReactions } from './reactions.js'
import { broadcast } from './rooms.js'

export async function postMessage(game: Game, player: Player, content: string) {
  const [message] = await db
    .insert(messages)
    .values({ gameId: game.id, playerId: player.id, content })
    .returning({
      id: messages.id,
      playerId: messages.playerId,
      content: messages.content,
      createdAt: messages.createdAt,
    })
  broadcast(game.id, { type: 'chat', message })
  if (game.status === 'lobby' || game.status === 'playing' || game.status === 'voting') {
    scheduleAiReactions(game, message).catch((err) =>
      logError('AI reactions scheduling failed', err, { gameId: game.id }),
    )
  }
}
