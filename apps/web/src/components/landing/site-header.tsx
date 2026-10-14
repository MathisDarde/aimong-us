import { Link } from 'react-router'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/auth-client'
import { ROUTES } from '@/lib/routes'
import { Logo } from './logo'

export function SiteHeader() {
  const { data: session } = useSession()

  return (
    <header className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-[clamp(16px,4vw,40px)] py-5">
      <a href="#" className="flex items-center gap-2.5">
        <Avatar color="cyan" disguise="mask" antenna size={44} />
        <Logo className="text-[28px]" />
      </a>
      <div className="flex items-center gap-7">
        <nav className="hidden gap-7 text-base font-semibold min-[760px]:flex">
          <a href="#how-it-works" className="text-creme">
            How it works
          </a>
          <a href="#challenge" className="text-creme">
            Spot the AI
          </a>
          {!session && (
            <Link to={ROUTES.login} className="text-creme">
              Sign in
            </Link>
          )}
        </nav>
        <Button asChild className="px-[22px] py-2.5">
          <Link to={ROUTES.play}>Play</Link>
        </Button>
      </div>
    </header>
  )
}
