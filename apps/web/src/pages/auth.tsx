import { Link, Navigate } from 'react-router'
import { AuthForm } from '@/components/auth/auth-form'
import { Logo } from '@/components/landing/logo'
import { useSession } from '@/lib/auth-client'
import { ROUTES } from '@/lib/routes'

export function AuthPage() {
  const { data: session, isPending } = useSession()

  if (isPending) return null
  if (session) return <Navigate to={ROUTES.play} replace />

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-nuit px-[clamp(16px,4vw,40px)] py-10">
      <Link to={ROUTES.home}>
        <Logo className="text-[32px]" />
      </Link>
      <AuthForm />
    </main>
  )
}
