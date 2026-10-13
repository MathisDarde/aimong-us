import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type AvatarColor = 'rose' | 'jaune' | 'menthe' | 'cyan' | 'creme'

export type Disguise = 'bag' | 'mustache' | 'glasses' | 'mask' | 'hat' | 'none'

type AvatarProps = {
  color?: AvatarColor
  disguise?: Disguise
  size?: number
  reveal?: 'human' | 'ai'
  dropped?: boolean
  antenna?: boolean
  className?: string
}

const cssColor = (token: string) => `var(--color-${token})`

const INK = cssColor('ink')
const CREME = cssColor('creme')
const MENTHE = cssColor('menthe')
const ROSE = cssColor('rose')
const JAUNE = cssColor('jaune')

export function Avatar({
  color: colorToken = 'cyan',
  disguise = 'mask',
  size = 96,
  reveal = 'human',
  dropped = false,
  antenna = false,
  className,
}: AvatarProps) {
  const color = cssColor(colorToken)
  const accent = colorToken === 'rose' ? JAUNE : ROSE
  const showRobot = dropped && reveal === 'ai'
  const smile = dropped && reveal === 'human'
  const showAntenna = antenna && !dropped

  const disguiseStyle: CSSProperties = {
    transformOrigin: '60px 70px',
    transform: dropped ? 'translate(26px,120px) rotate(42deg)' : 'none',
    opacity: dropped ? 0 : 1,
    transition: 'transform .9s cubic-bezier(.55,-0.45,.7,1), opacity .5s ease-in .45s',
  }

  return (
    <svg
      width={size}
      height={(size * 130) / 120}
      viewBox="0 0 120 130"
      className={cn('block overflow-visible', className)}
      aria-hidden
    >
      {showRobot ? (
        <>
          <line x1="60" y1="36" x2="60" y2="10" stroke={INK} strokeWidth="4" />
          <circle cx="60" cy="8" r="7" fill={accent} stroke={INK} strokeWidth="3" />
          <rect x="23" y="38" width="84" height="80" rx="16" fill={INK} />
          <rect x="8" y="60" width="12" height="26" rx="4" fill={color} stroke={INK} strokeWidth="3" />
          <rect x="100" y="60" width="12" height="26" rx="4" fill={color} stroke={INK} strokeWidth="3" />
          <rect x="18" y="33" width="84" height="80" rx="16" fill={color} stroke={INK} strokeWidth="4" />
          <rect x="28" y="47" width="64" height="42" rx="8" fill={INK} />
          <rect x="37" y="56" width="13" height="13" rx="2" fill={MENTHE} />
          <rect x="70" y="56" width="13" height="13" rx="2" fill={MENTHE} />
          <rect x="45" y="77" width="30" height="5" rx="2.5" fill={MENTHE} />
        </>
      ) : (
        <>
          {showAntenna && (
            <>
              <line x1="72" y1="40" x2="80" y2="4" stroke={INK} strokeWidth="4" />
              <circle cx="81" cy="3" r="6" fill={accent} stroke={INK} strokeWidth="3" />
            </>
          )}
          <circle cx="65" cy="80" r="44" fill={INK} />
          <circle cx="60" cy="75" r="44" fill={color} stroke={INK} strokeWidth="4" />
          <circle cx="46" cy="68" r="5" fill={INK} />
          <circle cx="74" cy="68" r="5" fill={INK} />
        </>
      )}

      {smile && (
        <>
          <path d="M45 86 Q60 100 75 86" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="34" cy="82" r="6" fill={ROSE} opacity="0.55" />
          <circle cx="86" cy="82" r="6" fill={ROSE} opacity="0.55" />
        </>
      )}

      <g style={disguiseStyle}>
        {disguise === 'bag' && (
          <>
            <rect x="14" y="22" width="92" height="78" rx="8" fill={CREME} stroke={INK} strokeWidth="4" />
            <polyline
              points="14,32 25,26 37,32 48,26 60,32 71,26 83,32 94,26 106,32"
              fill="none"
              stroke={INK}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <circle cx="46" cy="66" r="9" fill={INK} />
            <circle cx="74" cy="66" r="9" fill={INK} />
            <circle cx="47" cy="67" r="3" fill={CREME} />
            <circle cx="75" cy="67" r="3" fill={CREME} />
            <rect x="50" y="84" width="20" height="4" rx="2" fill={INK} />
          </>
        )}
        {disguise === 'mustache' && (
          <>
            <ellipse cx="49" cy="88" rx="13" ry="6" fill={INK} transform="rotate(12 49 88)" />
            <ellipse cx="71" cy="88" rx="13" ry="6" fill={INK} transform="rotate(-12 71 88)" />
            <rect x="37" y="54" width="18" height="5" rx="2.5" fill={INK} transform="rotate(-8 46 56)" />
            <rect x="65" y="54" width="18" height="5" rx="2.5" fill={INK} transform="rotate(8 74 56)" />
          </>
        )}
        {disguise === 'glasses' && (
          <>
            <circle cx="46" cy="68" r="12" fill="none" stroke={INK} strokeWidth="4" />
            <circle cx="74" cy="68" r="12" fill="none" stroke={INK} strokeWidth="4" />
            <line x1="58" y1="68" x2="62" y2="68" stroke={INK} strokeWidth="4" />
            <rect x="32" y="49" width="26" height="6" rx="3" fill={INK} />
            <rect x="62" y="49" width="26" height="6" rx="3" fill={INK} />
            <circle cx="60" cy="83" r="9" fill={accent} stroke={INK} strokeWidth="3" />
            <rect x="46" y="94" width="28" height="6" rx="3" fill={INK} />
          </>
        )}
        {disguise === 'mask' && (
          <>
            <line x1="18" y1="66" x2="28" y2="68" stroke={INK} strokeWidth="3" />
            <line x1="92" y1="68" x2="102" y2="66" stroke={INK} strokeWidth="3" />
            <rect x="24" y="55" width="72" height="26" rx="13" fill={accent} stroke={INK} strokeWidth="4" />
            <circle cx="46" cy="68" r="7" fill={INK} />
            <circle cx="74" cy="68" r="7" fill={INK} />
            <circle cx="47" cy="69" r="2.5" fill={CREME} />
            <circle cx="75" cy="69" r="2.5" fill={CREME} />
          </>
        )}
        {disguise === 'hat' && (
          <>
            <rect x="36" y="2" width="48" height="36" rx="5" fill={INK} />
            <rect x="36" y="26" width="48" height="8" fill={accent} />
            <rect x="22" y="34" width="76" height="9" rx="4.5" fill={INK} />
            <circle cx="74" cy="68" r="11" fill="none" stroke={INK} strokeWidth="3" />
            <line x1="84" y1="73" x2="90" y2="100" stroke={INK} strokeWidth="2" />
          </>
        )}
      </g>
    </svg>
  )
}
