import { REACTION_EMOJIS } from '@/lib/reactions'
import type { MessageReaction } from '@/lib/game-types'
import { cn } from '@/lib/utils'

type ReactionBarProps = {
  reactions: MessageReaction[]
  meId: string | null
  disabled: boolean
  pickerOpen: boolean
  onTogglePicker: () => void
  onReact: (emoji: string) => void
}

const CHIP_CLASSES =
  'flex cursor-pointer items-center gap-1 rounded-full border-3 border-ink px-2 py-0.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-60'

export function ReactionBar({
  reactions,
  meId,
  disabled,
  pickerOpen,
  onTogglePicker,
  onReact,
}: ReactionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {reactions.map(({ emoji, playerIds }) => {
        const mine = meId !== null && playerIds.includes(meId)
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            aria-pressed={mine}
            aria-label={`${emoji} ${playerIds.length}`}
            onClick={() => onReact(emoji)}
            className={cn(CHIP_CLASSES, mine ? 'bg-menthe' : 'bg-creme')}
          >
            <span aria-hidden>{emoji}</span>
            <span aria-hidden className="font-semibold">
              {playerIds.length}
            </span>
          </button>
        )
      })}

      {pickerOpen &&
        REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            aria-label={`React with ${emoji}`}
            onClick={() => onReact(emoji)}
            className={cn(CHIP_CLASSES, 'bg-nuit-400 text-creme')}
          >
            {emoji}
          </button>
        ))}

      <button
        type="button"
        disabled={disabled}
        aria-expanded={pickerOpen}
        aria-label="Add a reaction"
        onClick={onTogglePicker}
        className={cn(CHIP_CLASSES, 'bg-nuit-400 text-creme')}
      >
        {pickerOpen ? '×' : '+'}
      </button>
    </div>
  )
}
