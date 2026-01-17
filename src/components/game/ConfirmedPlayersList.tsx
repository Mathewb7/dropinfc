'use client'

import { GamePlayerWithProfile } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

interface ConfirmedPlayersListProps {
  players: GamePlayerWithProfile[]
  currentUserId?: string
}

const CONFIRMED_STATUSES = ['priority_confirmed', 'lottery_selected', 'confirmed'] as const

/**
 * Shows a list of players who have paid and been verified
 * Displayed to priority and lottery-selected players (not waitlist)
 */
export function ConfirmedPlayersList({ players, currentUserId }: ConfirmedPlayersListProps) {
  // Only show players who are confirmed AND have verified payment
  const paidPlayers = players.filter(p =>
    CONFIRMED_STATUSES.includes(p.status as typeof CONFIRMED_STATUSES[number]) &&
    p.payment_status === 'verified'
  )

  if (paidPlayers.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <CardTitle>Players Paid ({paidPlayers.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {paidPlayers.map((player) => (
            <div
              key={player.id}
              className={`py-2 px-3 rounded-md ${
                player.player_id === currentUserId
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-muted'
              }`}
            >
              <span className="font-medium">
                {player.player.display_name}
                {player.player_id === currentUserId && ' (You)'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
