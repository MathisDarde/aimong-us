import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-bold tracking-[-0.5px] text-creme', className)}>
      Among <span className="text-rose">AIs</span>
    </span>
  )
}
