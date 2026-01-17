'use client'

import { Game, GamePlayer, GamePlayerWithProfile } from '@/types/database'
import { PlayerActions } from './PlayerActions'
import { GameStatusCard } from './GameStatusCard'
import { ConfirmedPlayersList } from './ConfirmedPlayersList'

interface PriorityInvitedViewProps {
  game: Game
  myStatus: GamePlayer
  userId: string
  players: GamePlayerWithProfile[]
  onAction: () => void
}

/**
 * View for priority players who have been invited but not yet confirmed
 * Shows game info, action buttons, and list of all confirmed players
 */
export function PriorityInvitedView({
  game,
  myStatus,
  userId,
  players,
  onAction
}: PriorityInvitedViewProps) {
  return (
    <div className="space-y-6">
      <GameStatusCard game={game} myStatus={myStatus} />

      <PlayerActions
        game={game}
        myStatus={myStatus}
        userId={userId}
        onAction={onAction}
      />

      <ConfirmedPlayersList players={players} currentUserId={userId} />
    </div>
  )
}
