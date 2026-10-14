import { useEffect, useState } from 'react'

const TICK_MS = 250
const MS_PER_SECOND = 1000

export function useCountdown(endsInMs: number | null, resetKey: string): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (endsInMs === null) return
    const endsAt = Date.now() + endsInMs
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / MS_PER_SECOND)))
    tick()
    const timer = setInterval(tick, TICK_MS)
    return () => clearInterval(timer)
  }, [endsInMs, resetKey])

  return endsInMs === null ? null : secondsLeft
}
