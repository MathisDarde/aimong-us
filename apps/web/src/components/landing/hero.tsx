import { useState } from 'react'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'

const BUNTING = ['bg-rose', 'bg-jaune', 'bg-menthe', 'bg-cyan', 'bg-rose', 'bg-jaune', 'bg-menthe']
const SMALL_AVATAR = 'h-auto w-[62px] min-[760px]:w-[112px]'
const MEDIUM_AVATAR = 'h-auto w-[74px] min-[760px]:w-[132px]'
const LARGE_AVATAR = 'h-auto w-[86px] min-[760px]:w-[152px]'

export function Hero() {
  const [code, setCode] = useState('')
  const ready = code.length === 6

  return (
    <section
      id="play"
      className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-[clamp(32px,5vw,64px)] px-[clamp(16px,4vw,40px)] pt-[clamp(24px,5vw,64px)] pb-[clamp(48px,7vw,96px)]"
    >
      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
        <div className="flex items-center gap-2 self-start rounded-full bg-ink py-1.5 pr-3.5 pl-2 text-sm font-semibold">
          <span className="size-3 rounded-full border-2 border-creme bg-menthe" />
          Costume party · 4 to 6 players · 1 or 2 impostors
        </div>

        <h1 className="m-0 font-display text-[clamp(44px,6.2vw,84px)] leading-[1.02] font-bold tracking-[-1.5px] text-balance">
          One of your friends is{' '}
          <span className="inline-block -rotate-2 rounded-2xl border-4 border-ink bg-jaune px-3.5 text-ink shadow-hard-5">
            an AI.
          </span>{' '}
          Find them.
        </h1>

        <p className="m-0 max-w-[520px] text-[clamp(17px,1.6vw,20px)] leading-normal text-pretty opacity-85">
          Three minutes of chat on an absurd theme, one vote, and the masks come off. The disguised
          robots, of course, plan to stay at the party.
        </p>

        <div className="flex flex-wrap items-stretch gap-4 pt-2">
          <Button size="lg">Create a game</Button>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex items-stretch overflow-hidden rounded-[18px] border-4 border-ink bg-creme shadow-hard-6"
          >
            <input
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
              }
              placeholder="ABC123"
              maxLength={6}
              aria-label="Game code"
              className="w-[170px] border-0 bg-transparent px-4 font-display text-2xl font-semibold tracking-[4px] text-ink uppercase outline-0 placeholder:text-ink/35"
            />
            <button
              type="submit"
              disabled={!ready}
              className={`border-0 border-l-4 border-ink px-5 font-display text-lg font-semibold text-ink disabled:cursor-not-allowed ${ready ? 'cursor-pointer bg-menthe' : 'bg-cyan'}`}
            >
              {ready ? 'Go!' : `Join ${code.length}/6`}
            </button>
          </form>
        </div>

        <span className="text-sm opacity-70">
          Got a code from a friend? 6 characters, no account needed.
        </span>
      </div>

      <div className="relative h-[clamp(320px,38vw,480px)] min-w-0 flex-[1_1_460px] overflow-hidden rounded-[32px] border-4 border-ink bg-nuit-400 shadow-hard-10">
        <div className="absolute top-[34px] -right-2.5 -left-2.5 h-[3px] -rotate-2 bg-ink" />
        <div className="absolute top-[26px] right-6 left-6 flex -rotate-2 justify-between">
          {BUNTING.map((c, i) => (
            <span
              key={i}
              className={`h-[22px] w-[18px] rounded-full border-3 border-ink ${c}`}
            />
          ))}
        </div>
        <div className="absolute top-[70px] right-9 size-[54px] rounded-full border-4 border-ink bg-creme" />
        <div className="absolute inset-x-0 bottom-0 h-[24%] border-t-4 border-ink bg-nuit" />
        <div className="absolute top-[22%] left-[56%] z-[2] -translate-x-1/2 rotate-3 rounded-[16px_16px_16px_4px] border-3 border-ink bg-creme px-3.5 py-2 font-display text-[clamp(13px,1.3vw,17px)] font-semibold whitespace-nowrap text-ink shadow-hard-4">
          Beep… uh, hi everyone!
        </div>
        <div className="absolute inset-x-0 bottom-[12%] flex items-end justify-center">
          <div className="-mr-3.5 -rotate-6">
            <Avatar color="jaune" disguise="glasses" className={SMALL_AVATAR} />
          </div>
          <div className="-mr-2.5">
            <Avatar color="rose" disguise="mustache" className={MEDIUM_AVATAR} />
          </div>
          <div className="relative z-[1]">
            <Avatar color="cyan" disguise="mask" antenna className={LARGE_AVATAR} />
          </div>
          <div className="-ml-2.5">
            <Avatar color="menthe" disguise="bag" className={MEDIUM_AVATAR} />
          </div>
          <div className="-ml-3.5 rotate-[5deg]">
            <Avatar color="creme" disguise="hat" className={SMALL_AVATAR} />
          </div>
        </div>
      </div>
    </section>
  )
}
