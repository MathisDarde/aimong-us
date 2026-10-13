import type { AvatarColor, Disguise } from '@/components/avatar'

const COLORS: AvatarColor[] = ['rose', 'jaune', 'menthe', 'cyan']
const DISGUISES: Disguise[] = ['mustache', 'glasses', 'bag', 'mask', 'hat']

export function playerLook(index: number) {
  return {
    color: COLORS[index % COLORS.length],
    disguise: DISGUISES[index % DISGUISES.length],
  }
}
