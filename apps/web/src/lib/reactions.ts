import type { ChatMessage, MessageReaction, ReactionEvent } from '@/lib/game-types'

export const REACTION_EMOJIS = ['👍', '😂', '😮', '🤔', '🤖']

function emojiOrder(emoji: string) {
  return REACTION_EMOJIS.indexOf(emoji)
}

export function applyReaction(messages: ChatMessage[], event: ReactionEvent): ChatMessage[] {
  return messages.map((message) => {
    if (message.id !== event.messageId) return message

    const reactions = message.reactions ?? []
    const others = reactions.filter((reaction) => reaction.emoji !== event.emoji)
    const current = reactions.find((reaction) => reaction.emoji === event.emoji)?.playerIds ?? []
    const playerIds = event.active
      ? [...new Set([...current, event.playerId])]
      : current.filter((id) => id !== event.playerId)

    const next: MessageReaction[] = playerIds.length
      ? [...others, { emoji: event.emoji, playerIds }]
      : others
    return { ...message, reactions: next.sort((a, b) => emojiOrder(a.emoji) - emojiOrder(b.emoji)) }
  })
}
