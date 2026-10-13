import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-bold tracking-[-0.5px] text-creme', className)}>
      Aimong <span className="text-rose">Us</span>
    </span>
  )
}
