import { z } from 'zod'
import { GAME_CODE_REGEX } from './game-state.js'

export const CHAT_MAX_LENGTH = 500

export const gameCodeParam = z.strictObject({
  code: z.string().regex(GAME_CODE_REGEX),
})

export const clientEventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('chat'),
    content: z.string().trim().min(1).max(CHAT_MAX_LENGTH),
  }),
  z.strictObject({ type: z.literal('vote'), targetId: z.uuid() }),
  z.strictObject({ type: z.literal('typing') }),
])

export type ClientEvent = z.infer<typeof clientEventSchema>
