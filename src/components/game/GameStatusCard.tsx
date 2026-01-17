'use client'

import { Game, GamePlayer } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatGameDate, formatTime, timeUntil } from '@/lib/utils'
import { GAME_CONFIG } from '@/lib/constants'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'

interface GameStatusCardProps {
  game: Game
  myStatus?: GamePlayer | null
  confirmedCount?: number
}

const CONFIRMED_STATUSES = ['priority_confirmed', 'lottery_selected', 'confirmed'] as const

function isConfirmedStatus(status: string): boolean {
  return CONFIRMED_STATUSES.includes(status as typeof CONFIRMED_STATUSES[number])
}

const GAME_STATUS_CONFIG = {
  priority_open: { text: 'Priority Window Open', variant: 'default' as const },
  waitlist_open: { text: 'Waitlist Open', variant: 'secondary' as const },
  payment_pending: { text: 'Payment Pending', className: 'bg-yellow-500 hover:bg-yellow-600' },
  teams_assigned: { text: 'Teams Assigned', className: 'bg-green-600 hover:bg-green-700' },
  completed: { text: 'Completed', variant: 'outline' as const },
  cancelled: { text: 'Cancelled', variant: 'destructive' as const },
} as const

const PLAYER_STATUS_CONFIG = {
  priority_invited: { text: 'Priority Invited', variant: 'default' as const },
  priority_confirmed: { text: 'Priority Confirmed', variant: 'default' as const },
  priority_declined: { text: 'Declined', variant: 'outline' as const },
  waitlist: { text: 'On Waitlist', variant: 'secondary' as const },
  lottery_selected: { text: 'Selected in Lottery', variant: 'default' as const },
  confirmed: { text: 'Confirmed', variant: 'default' as const },
  withdrawn: { text: 'Withdrawn', variant: 'destructive' as const },
  removed_nonpayment: { text: 'Removed (Non-payment)', variant: 'destructive' as const },
} as const

/**
 * Displays the current game's basic information and status
 */
export function GameStatusCard({ game, myStatus, confirmedCount }: GameStatusCardProps) {
  function getStatusBadge(): React.ReactNode {
    const config = GAME_STATUS_CONFIG[game.status]
    if ('className' in config) {
      return <Badge className={config.className}>{config.text}</Badge>
    }
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  function getMyStatusBadge(): React.ReactNode {
    if (!myStatus) return null
    const config = PLAYER_STATUS_CONFIG[myStatus.status]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">Next Game</CardTitle>
            <CardDescription>{formatGameDate(game.game_date)}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {getStatusBadge()}
            {getMyStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Game Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{GAME_CONFIG.DAY_OF_WEEK}s</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>{GAME_CONFIG.START_TIME} - {GAME_CONFIG.END_TIME}</span>
          </div>
          <div className="flex items-center gap-2 text-sm col-span-full">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span>{GAME_CONFIG.LOCATION}</span>
          </div>
          {confirmedCount !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-500" />
              <span>
                {confirmedCount} / {GAME_CONFIG.TOTAL_PLAYERS} players confirmed
              </span>
            </div>
          )}
        </div>

        {/* Deadlines */}
        <div className="border-t pt-4 space-y-2">
          <h4 className="font-semibold text-sm">Upcoming Deadlines</h4>
          <div className="space-y-1 text-sm">
            {game.status === 'priority_open' && (
              <div className="flex justify-between">
                <span>Priority Deadline:</span>
                <span className="font-medium">{timeUntil(game.priority_deadline)}</span>
              </div>
            )}
            {/* Only show payment deadline to confirmed unpaid players */}
            {game.status === 'payment_pending' &&
              myStatus &&
              isConfirmedStatus(myStatus.status) &&
              myStatus.payment_status === 'pending' && (
              <div className="flex justify-between">
                <span>Payment Deadline:</span>
                <span className="font-medium">{timeUntil(game.payment_deadline)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
