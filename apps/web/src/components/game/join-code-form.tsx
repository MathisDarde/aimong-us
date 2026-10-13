import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { gamePath } from '@/lib/routes'

const GAME_CODE_LENGTH = 6

export function JoinCodeForm() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const ready = code.length === GAME_CODE_LENGTH

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (ready) await navigate(gamePath(code))
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-stretch overflow-hidden rounded-[18px] border-4 border-ink bg-creme shadow-hard-6"
    >
      <input
        value={code}
        onChange={(e) =>
          setCode(
            e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, GAME_CODE_LENGTH),
          )
        }
        placeholder="ABC123"
        maxLength={GAME_CODE_LENGTH}
        aria-label="Game code"
        className="w-[170px] border-0 bg-transparent px-4 font-display text-2xl font-semibold tracking-[4px] text-ink uppercase outline-0 placeholder:text-ink/35"
      />
      <button
        type="submit"
        disabled={!ready}
        className={`border-0 border-l-4 border-ink px-5 font-display text-lg font-semibold text-ink disabled:cursor-not-allowed ${ready ? 'cursor-pointer bg-menthe' : 'bg-cyan'}`}
      >
        {ready ? 'Go!' : `Join ${code.length}/${GAME_CODE_LENGTH}`}
      </button>
    </form>
  )
}
