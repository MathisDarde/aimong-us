import { useState } from 'react'
import { useNavigate } from 'react-router'
import { JoinCodeForm } from '@/components/game/join-code-form'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from '@/lib/auth-client'
import { createGame } from '@/lib/game-api'
import { gamePath, ROUTES } from '@/lib/routes'

export function PlayPage() {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleCreate() {
    setPending(true)
    setError(null)
    try {
      const { state } = await createGame()
      await navigate(gamePath(state.game.code))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the game')
      setPending(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    await navigate(ROUTES.home, { replace: true })
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-nuit px-[clamp(16px,4vw,40px)] text-center">
      <h1 className="m-0 font-display text-[clamp(34px,4.4vw,56px)] font-bold">
        Hi {session?.user.name}!
      </h1>

      <div className="flex flex-wrap items-stretch justify-center gap-4">
        <Button size="lg" onClick={handleCreate} disabled={pending}>
          {pending ? 'Creating…' : 'Create a game'}
        </Button>
        <JoinCodeForm />
      </div>

      {error && (
        <p role="alert" className="m-0 font-semibold text-rose">
          {error}
        </p>
      )}

      <Button variant="ghost" onClick={handleSignOut}>
        Sign out
      </Button>
    </main>
  )
}
