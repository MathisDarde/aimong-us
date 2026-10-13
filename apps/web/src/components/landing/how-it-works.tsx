import type { ReactNode } from 'react'
import { Avatar } from '@/components/avatar'

function StepCard({
  n,
  color,
  title,
  children,
  scene,
}: {
  n: number
  color: string
  title: string
  children: ReactNode
  scene: ReactNode
}) {
  return (
    <div className="flex flex-col gap-[18px] rounded-[26px] border-4 border-ink bg-nuit-400 p-[18px] shadow-hard-8">
      <div className="relative flex h-[200px] items-end justify-center overflow-hidden rounded-[18px] border-3 border-ink bg-nuit pb-[18px]">
        {scene}
      </div>
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 items-center justify-center rounded-full border-3 border-ink font-display text-xl font-bold text-ink"
          style={{ background: color }}
        >
          {n}
        </span>
        <h3 className="m-0 font-display text-[28px] font-bold">{title}</h3>
      </div>
      <p className="m-0 text-[17px] leading-normal text-pretty opacity-85">{children}</p>
    </div>
  )
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-4 border-t-4 border-ink bg-ink px-[clamp(16px,4vw,40px)] py-[clamp(56px,7vw,96px)]"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10">
        <div className="flex flex-col gap-2.5">
          <span className="font-display text-base font-semibold tracking-[2px] text-menthe">
            HOW IT WORKS
          </span>
          <h2 className="m-0 font-display text-[clamp(34px,4.4vw,56px)] leading-[1.05] font-bold text-balance">
            Chat. Suspect. Unmask.
          </h2>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-7">
          <StepCard
            n={1}
            color="#FFD23F"
            title="Chat"
            scene={
              <div className="flex gap-7">
                <div className="absolute top-[22px] left-[22px] rounded-[4px_14px_14px_14px] border-3 border-ink bg-rose px-3 py-1.5 text-sm font-semibold text-ink">
                  thursday shepherds pie 🤢
                </div>
                <div className="absolute top-[62px] right-[22px] rounded-[14px_4px_14px_14px] border-3 border-ink bg-jaune px-3 py-1.5 text-sm font-semibold text-ink">
                  LMAOO so true
                </div>
                <Avatar color="#FF5CA8" disguise="mustache" size={84} />
                <Avatar color="#FFD23F" disguise="glasses" size={84} />
              </div>
            }
          >
            3 minutes of chat on an assigned theme: “Your worst cafeteria meal”, “Your most useless
            talent”… Tell stories, joke around, improvise.
          </StepCard>

          <StepCard
            n={2}
            color="#4FD6FF"
            title="Suspect"
            scene={
              <>
                <span className="absolute top-6 left-[30px] -rotate-12 font-display text-[40px] font-bold text-jaune">
                  ?
                </span>
                <span className="absolute top-10 right-11 rotate-[14deg] font-display text-[30px] font-bold text-rose">
                  ?
                </span>
                <Avatar color="#4FD6FF" disguise="mask" size={104} />
                <div className="absolute top-[58px] left-[calc(50%+4px)] size-16 rounded-full border-[7px] border-creme shadow-hard-3" />
                <div className="absolute top-[116px] left-[calc(50%+58px)] h-11 w-3 -rotate-40 rounded-md border-3 border-ink bg-creme" />
              </>
            }
          >
            Too polite? Replies too fast? Zero typos at midnight? AIs imitate well. Just not
            perfectly.
          </StepCard>

          <StepCard
            n={3}
            color="#43F0B5"
            title="Unmask"
            scene={
              <>
                <Avatar color="#4FD6FF" disguise="mask" reveal="ai" dropped size={104} />
                <div className="absolute right-[calc(50%-120px)] bottom-3.5 flex h-[22px] w-[58px] rotate-[18deg] items-center justify-around rounded-[11px] border-3 border-ink bg-rose px-2">
                  <span className="size-[9px] rounded-full bg-ink" />
                  <span className="size-[9px] rounded-full bg-ink" />
                </div>
                <div className="absolute top-[22px] left-[calc(50%-130px)] -rotate-[14deg] rounded-[10px] border-4 border-menthe px-3 py-0.5 font-display text-[28px] font-bold tracking-[2px] text-menthe">
                  AI
                </div>
              </>
            }
          >
            Everyone votes. The most suspicious player loses their disguise: a good human blob… or a
            robot caught red-handed.
          </StepCard>
        </div>
      </div>
    </section>
  )
}
