import { Avatar } from '@/components/avatar'
import { RoleStamp } from '@/components/game/role-stamp'
import type { PublicPlayer } from '@/lib/game-types'
import { playerLook } from '@/lib/player-look'
import { cn } from '@/lib/utils'

type PlayerListProps = {
  players: PublicPlayer[]
  meId: string | null
  votedPlayerIds: string[]
  speakerId: string | null
}

function presenceLabel(player: PublicPlayer, speakerId: string | null) {
  if (player.id === speakerId) return 'Speaking'
  if (player.isEliminated) return 'Eliminated'
  return player.online ? 'Online' : 'Offline'
}

export function PlayerList({ players, meId, votedPlayerIds, speakerId }: PlayerListProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {players.map((player, index) => {
        const { color, disguise } = playerLook(index)
        const isMe = player.id === meId

        return (
          <li
            key={player.id}
            className={cn(
              'flex items-center gap-3 rounded-[18px] border-3 border-ink bg-nuit px-3 py-2',
              player.isEliminated && 'opacity-50',
              player.id === speakerId && 'border-menthe',
            )}
          >
            <Avatar color={color} disguise={disguise} size={40} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-display text-base font-semibold">
                {player.nickname}
                {isMe && ' (you)'}
              </span>
              <span className="text-xs opacity-70">
                {presenceLabel(player, speakerId)}
                {votedPlayerIds.includes(player.id) && ' · voted'}
              </span>
            </div>
            {player.role && <RoleStamp role={player.role} />}
          </li>
        )
      })}
    </ul>
  )
}
