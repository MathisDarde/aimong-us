import { Avatar } from '@/components/avatar'
import { Logo } from './logo'

export function SiteFooter() {
  return (
    <footer className="bg-ink px-[clamp(16px,4vw,40px)] py-10">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-12 gap-y-6">
        <div className="flex items-center gap-2.5">
          <Avatar color="rose" disguise="mustache" size={36} />
          <div className="flex flex-col">
            <Logo className="text-xl" />
            <span className="text-sm opacity-70">
              Student project · 2026 · no robots were harmed
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
          <a href="https://github.com/MathisDarde/aimong-us" className="font-semibold">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
