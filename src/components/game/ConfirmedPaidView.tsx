'use client'

import { Game, GamePlayer, GamePlayerWithProfile } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GAME_CONFIG, TEAM_COLORS } from '@/lib/constants'
import { formatGameDate } from '@/lib/utils'
import { ConfirmedPlayersList } from './ConfirmedPlayersList'

interface ConfirmedPaidViewProps {
  game: Game
  myStatus: GamePlayer
  players: GamePlayerWithProfile[]
  userId?: string
}

const CONFIRMED_STATUSES = ['priority_confirmed', 'lottery_selected', 'confirmed'] as const

function isConfirmedStatus(status: string): boolean {
  return CONFIRMED_STATUSES.includes(status as typeof CONFIRMED_STATUSES[number])
}

/**
 * Clean view for confirmed+paid players
 * Shows only game info, confirmed count, and team assignment (when announced)
 */
export function ConfirmedPaidView({
  game,
  myStatus,
  players,
  userId
}: ConfirmedPaidViewProps) {
  const formattedDate = formatGameDate(game.game_date)

  const confirmedCount = players.filter(p => isConfirmedStatus(p.status)).length

  const myTeam = myStatus.team
  const myTeamPlayers = myTeam
    ? players.filter(p => p.team === myTeam)
    : []

  const teamColors = myTeam === 'dark' ? TEAM_COLORS.DARK : TEAM_COLORS.LIGHT

  return (
    <div className="space-y-6">
      {/* Game Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Next Game</CardTitle>
            {myStatus.payment_status === 'verified' && (
              <Badge className="bg-green-600 hover:bg-green-700">Paid ✓</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-2xl font-semibold">{formattedDate}</p>
          <p className="text-lg text-muted-foreground">
            {GAME_CONFIG.START_TIME} - {GAME_CONFIG.END_TIME}
          </p>
          <p className="text-muted-foreground">{GAME_CONFIG.LOCATION}</p>
          <p className="text-sm text-muted-foreground mt-4">
            {confirmedCount} / {GAME_CONFIG.TOTAL_PLAYERS} players confirmed
          </p>
        </CardContent>
      </Card>

      {/* Show confirmed players list when teams NOT announced */}
      {!game.teams_announced && (
        <ConfirmedPlayersList players={players} currentUserId={userId} />
      )}

      {/* Team Assignment - Only shown when teams announced */}
      {game.teams_announced && myTeam && (
        <Card className={`${teamColors.bg} ${teamColors.text}`}>
          <CardHeader>
            <CardTitle>Your Team: {teamColors.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">
                Position: {myStatus.position === 'keeper' ? 'Goalkeeper' : 'Field Player'}
                {' '}
                {myStatus.is_starting ? '(Starting)' : '(Sub)'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-sm uppercase tracking-wide">Teammates:</p>
              {myTeamPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/10"
                >
                  <span className="font-medium">{player.player.display_name}</span>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {player.position === 'keeper' ? 'GK' : 'Field'}
                    </Badge>
                    {player.is_starting && (
                      <Badge variant="default">Starting</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
