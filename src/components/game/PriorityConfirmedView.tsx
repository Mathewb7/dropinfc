'use client'

import { Game, GamePlayer, GamePlayerWithProfile } from '@/types/database'
import { GameStatusCard } from './GameStatusCard'
import { PlayerActions } from './PlayerActions'
import { ConfirmedPlayersList } from './ConfirmedPlayersList'

interface PriorityConfirmedViewProps {
  game: Game
  myStatus: GamePlayer
  userId: string
  players: GamePlayerWithProfile[]
  onAction: () => void
}

/**
 * View for priority players who have confirmed but not yet paid
 * Shows game info, payment deadline, action buttons, and confirmed players list
 */
export function PriorityConfirmedView({
  game,
  myStatus,
  userId,
  players,
  onAction
}: PriorityConfirmedViewProps) {
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
