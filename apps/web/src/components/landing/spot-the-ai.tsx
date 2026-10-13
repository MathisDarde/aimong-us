import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar, type AvatarColor, type Disguise } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

type MsgColor = Exclude<AvatarColor, 'creme'>

const MSG_COLOR_CLASSES: Record<MsgColor, { text: string; bg: string }> = {
  rose: { text: 'text-rose', bg: 'bg-rose' },
  jaune: { text: 'text-jaune', bg: 'bg-jaune' },
  menthe: { text: 'text-menthe', bg: 'bg-menthe' },
  cyan: { text: 'text-cyan', bg: 'bg-cyan' },
}

type Msg = {
  name: string
  color: MsgColor
  disguise: Disguise
  time: string
  text: string
  ai: boolean
  why?: string
}

const MSGS: Msg[] = [
  {
    name: 'Kevin_93',
    color: 'rose',
    disguise: 'mustache',
    time: '23:41',
    text: 'thursday shepherds pie. tastes like wet cardboard ngl',
    ai: false,
    why: 'the missing apostrophe, the “ngl”… certified human.',
  },
  {
    name: 'Margaux',
    color: 'jaune',
    disguise: 'glasses',
    time: '23:41',
    text: "LMAOO the square fish sticks. nobody ever explained to me why they're square",
    ai: false,
    why: 'LMAOO in caps and a real existential question: very human.',
  },
  {
    name: 'Camille_R',
    color: 'cyan',
    disguise: 'mask',
    time: '23:42',
    text: 'Personally, I would say the cauliflower gratin: a texture that is both soft and surprisingly dry. A memorable culinary experience!',
    ai: true,
  },
  {
    name: 'Uncle Bernard',
    color: 'menthe',
    disguise: 'bag',
    time: '23:42',
    text: "creamed spinach… just thinkin about it gives me chills 😭",
    ai: false,
    why: 'dropped letters and sincere trauma.',
  },
]

export function SpotTheAI() {
  const [picked, setPicked] = useState<number | null>(null)
  const done = picked !== null
  const right = done && MSGS[picked].ai

  return (
    <section id="challenge" className="scroll-mt-4 px-[clamp(16px,4vw,40px)] py-[clamp(56px,7vw,96px)]">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-[clamp(32px,5vw,64px)]">
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-[18px]">
          <span className="font-display text-base font-semibold tracking-[2px] text-rose">
            LITTLE CHALLENGE
          </span>
          <h2 className="m-0 font-display text-[clamp(34px,4.4vw,56px)] leading-[1.05] font-bold">
            Spot the AI
          </h2>
          <p className="m-0 text-lg leading-normal text-pretty opacity-85">
            A real game excerpt. Four guests, one robot. Click the message that looks fishy to you.
          </p>
          <div className="-rotate-[1.5deg] self-start rounded-[14px] border-3 border-ink bg-jaune px-4 py-2.5 text-ink shadow-hard-4">
            <div className="text-xs font-bold tracking-[1.5px]">ASSIGNED THEME</div>
            <div className="font-display text-[22px] font-bold">Your worst cafeteria meal</div>
          </div>

          {done && (
            <div className="flex flex-col gap-3 rounded-[20px] border-4 border-ink bg-nuit-400 p-5 shadow-hard-6 animate-in fade-in slide-in-from-bottom-2">
              <div
                className={cn('font-display text-[28px] font-bold', right ? 'text-menthe' : 'text-rose')}
              >
                {right ? 'Good catch, detective!' : `Nope, ${MSGS[picked].name} is human.`}
              </div>
              <p className="m-0 text-base leading-normal">
                {right
                  ? "A colon, zero typos, “culinary experience”… Nobody writes like that at 11:42 PM. Camille_R was a disguised robot."
                  : `Hint: ${MSGS[picked].why ?? ''} The robot was Camille_R, with their impeccable punctuation.`}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="sm">
                  <Link to={ROUTES.play}>Start a real game</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
                  Play again
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-[1.3_1_480px] overflow-hidden rounded-[28px] border-4 border-ink bg-ink shadow-hard-10">
          <div className="flex items-center justify-between gap-3 border-b-4 border-ink bg-nuit-400 px-5 py-3.5">
            <span className="font-display text-lg font-semibold">#cafeteria</span>
            <span className="text-sm font-semibold opacity-80">
              {done ? 'Result' : 'Which one is the AI?'}
            </span>
          </div>

          <div className="flex flex-col gap-5 px-5 pt-6 pb-7">
            {MSGS.map((m, i) => {
              const dropped = done && (m.ai || i === picked)
              const stampClasses = m.ai ? 'border-menthe text-menthe' : 'border-rose text-rose'
              return (
                <button
                  key={m.name}
                  type="button"
                  disabled={done}
                  onClick={() => setPicked(i)}
                  className={cn(
                    'flex items-start gap-3 rounded-[20px] p-2 text-left outline-offset-2 transition-colors hover:bg-nuit disabled:cursor-default',
                    !done && 'cursor-pointer',
                    done && i === picked && ['outline-4', 'outline-solid', right ? 'outline-menthe' : 'outline-rose'],
                  )}
                >
                  <div className="relative flex-none">
                    <Avatar
                      color={m.color}
                      disguise={m.disguise}
                      reveal={m.ai ? 'ai' : 'human'}
                      dropped={dropped}
                      size={48}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn('font-display text-base font-semibold', MSG_COLOR_CLASSES[m.color].text)}
                      >
                        {m.name}
                      </span>
                      <span className="text-xs opacity-60">{m.time}</span>
                      {dropped && (
                        <span
                          className={cn(
                            'ml-auto -rotate-6 rounded-lg border-3 px-2 font-display text-sm font-bold tracking-[1.5px]',
                            stampClasses,
                          )}
                        >
                          {m.ai ? 'AI' : 'HUMAN'}
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        'self-start rounded-[4px_18px_18px_18px] border-3 border-ink px-3.5 py-2.5 text-base leading-[1.45] text-pretty text-ink shadow-hard-3',
                        MSG_COLOR_CLASSES[m.color].bg,
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
