import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { ChatMessage, PublicPlayer } from '@/lib/game-types'
import { cn } from '@/lib/utils'

const CHAT_MAX_LENGTH = 500

type ChatPanelProps = {
  messages: ChatMessage[]
  players: PublicPlayer[]
  meId: string | null
  canSend: boolean
  onSend: (content: string) => void
}

export function ChatPanel({ messages, players, meId, canSend, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    onSend(content)
    setDraft('')
  }

  function nicknameOf(playerId: string) {
    return players.find((player) => player.id === playerId)?.nickname ?? 'Unknown'
  }

  return (
    <div className="flex h-[min(70svh,560px)] flex-col overflow-hidden rounded-[28px] border-4 border-ink bg-ink shadow-hard-10">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5" aria-live="polite">
        {messages.length === 0 && <p className="m-0 opacity-70">No messages yet. Say hi!</p>}
        {messages.map((message) => {
          const mine = message.playerId === meId
          return (
            <div key={message.id} className={cn('flex flex-col gap-1', mine && 'items-end')}>
              <span className="text-xs font-semibold opacity-70">{nicknameOf(message.playerId)}</span>
              <p
                className={cn(
                  'm-0 max-w-[85%] rounded-[18px] border-3 border-ink px-3.5 py-2 text-ink shadow-hard-3',
                  mine ? 'bg-menthe' : 'bg-creme',
                )}
              >
                {message.content}
              </p>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 border-t-4 border-ink bg-nuit-400 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={CHAT_MAX_LENGTH}
          disabled={!canSend}
          aria-label="Message"
          placeholder={canSend ? 'Type a message…' : 'Chat is closed'}
          className="min-w-0 flex-1 rounded-[14px] border-3 border-ink bg-creme px-4 py-2 text-ink outline-0 focus-visible:ring-[3px] focus-visible:ring-cyan/60 disabled:opacity-60"
        />
        <Button type="submit" size="sm" disabled={!canSend}>
          Send
        </Button>
      </form>
    </div>
  )
}
