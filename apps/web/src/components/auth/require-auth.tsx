import { Navigate, Outlet } from 'react-router'
import { ROUTES } from '@/lib/routes'
import { useSession } from '@/lib/auth-client'

export function RequireAuth() {
  const { data: session, isPending } = useSession()

  if (isPending) return null
  if (!session) return <Navigate to={ROUTES.auth} replace />
  return <Outlet />
}
