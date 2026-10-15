import { useEffect, useState } from 'react'
import { Avatar } from '@/components/avatar'
import type { Role } from '@/lib/game-types'
import { playerLook } from '@/lib/player-look'

type RevealAvatarProps = {
  index: number
  role: Role | null
  size: number
  delayMs?: number
}

const DEFAULT_DELAY_MS = 600

export function RevealAvatar({ index, role, size, delayMs = DEFAULT_DELAY_MS }: RevealAvatarProps) {
  const [dropped, setDropped] = useState(false)
  const { color, disguise } = playerLook(index)

  useEffect(() => {
    const timer = window.setTimeout(() => setDropped(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs])

  return (
    <Avatar
      color={color}
      disguise={disguise}
      size={size}
      reveal={role ?? 'human'}
      dropped={role !== null && dropped}
    />
  )
}
