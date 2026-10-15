import type { Role } from '@/lib/game-types'
import { cn } from '@/lib/utils'

type RoleStampProps = {
  role: Role
  className?: string
}

const ROLE_LABEL: Record<Role, string> = { ai: 'AI', human: 'Human' }

export function RoleStamp({ role, className }: RoleStampProps) {
  return (
    <span
      className={cn(
        '-rotate-6 rounded-lg border-3 px-2 font-display text-sm font-bold tracking-[1.5px]',
        role === 'ai' ? 'border-menthe text-menthe' : 'border-rose text-rose',
        className,
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  )
}
