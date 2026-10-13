import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from '@/lib/auth-client'
import { ROUTES } from '@/lib/routes'

export function PlayPage() {
  const navigate = useNavigate()
  const { data: session } = useSession()

  async function handleSignOut() {
    await signOut()
    await navigate(ROUTES.home, { replace: true })
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-nuit px-[clamp(16px,4vw,40px)] text-center">
      <h1 className="m-0 font-display text-[clamp(34px,4.4vw,56px)] font-bold">
        Hi {session?.user.name}!
      </h1>
      <p className="m-0 text-lg opacity-85">Game rooms are coming soon.</p>
      <Button variant="ghost" onClick={handleSignOut}>
        Sign out
      </Button>
    </main>
  )
}
