'use client'

import { useMemo } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuth } from '@/contexts/AuthContext'
import { useGame } from '@/hooks/useGame'
import { useStrikeSettings } from '@/hooks/useStrikeSettings'
import { NotRegisteredView } from '@/components/game/NotRegisteredView'
import { PriorityInvitedView } from '@/components/game/PriorityInvitedView'
import { PriorityConfirmedView } from '@/components/game/PriorityConfirmedView'
import { ConfirmedPaidView } from '@/components/game/ConfirmedPaidView'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, XCircle } from 'lucide-react'

// Helper constants and functions
const PAID_STATUSES = ['verified', 'marked_paid'] as const
const CONFIRMED_STATUSES = ['priority_confirmed', 'lottery_selected', 'confirmed'] as const

function isPaidStatus(status: string | undefined): boolean {
  return status !== undefined && PAID_STATUSES.includes(status as typeof PAID_STATUSES[number])
}

function isConfirmedStatus(status: string): boolean {
  return CONFIRMED_STATUSES.includes(status as typeof CONFIRMED_STATUSES[number])
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useRequireAuth()
  const { profile } = useAuth()
  const { game, players, loading: gameLoading, error, refetch } = useGame()
  const { strikeSettings } = useStrikeSettings()

  // Find current user's status in this game (compute before early returns)
  const myStatus = players.find(p => p.player_id === user?.id) || null

  // Check if player is in cooldown
  const isInCooldown = profile?.strike_cooldown_until && new Date(profile.strike_cooldown_until) > new Date()

  // Determine view state (must be called before early returns)
  const viewState = useMemo(() => {
    if (!myStatus) return 'not_registered'

    const isPaid = isPaidStatus(myStatus.payment_status)
    const isConfirmed = isConfirmedStatus(myStatus.status)

    if (isConfirmed && isPaid) return 'confirmed_paid'
    if (myStatus.status === 'priority_invited') return 'priority_invited'
    if (myStatus.status === 'priority_confirmed' || myStatus.status === 'lottery_selected') return 'priority_confirmed'
    if (myStatus.status === 'priority_declined' || myStatus.status === 'withdrawn') return 'declined_withdrawn'
    // Remove 'on_waitlist' case - no longer needed with FCFS

    return 'not_registered'
  }, [myStatus])

  // Early returns AFTER all hooks
  if (authLoading || gameLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Upcoming Games</CardTitle>
            <CardDescription>
              There are no games scheduled at the moment. Check back soon!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {/* Cooldown Warning - Show to everyone if applicable */}
        {isInCooldown && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold">You are currently in a cooldown period</div>
              <div className="text-sm mt-1">
                Reason: {strikeSettings.strikes_before_cooldown} withdrawal strikes - You cannot join games until{' '}
                <strong>{new Date(profile.strike_cooldown_until!).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</strong>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* View-specific content based on player status */}
        {user && viewState === 'not_registered' && (
          <NotRegisteredView
            game={game}
            userId={user.id}
            onAction={refetch}
          />
        )}

        {user && viewState === 'declined_withdrawn' && (
          <NotRegisteredView
            game={game}
            userId={user.id}
            onAction={refetch}
          />
        )}

        {user && myStatus && viewState === 'priority_invited' && (
          <PriorityInvitedView
            game={game}
            myStatus={myStatus}
            userId={user.id}
            players={players}
            onAction={refetch}
          />
        )}

        {user && myStatus && viewState === 'priority_confirmed' && (
          <PriorityConfirmedView
            game={game}
            myStatus={myStatus}
            userId={user.id}
            players={players}
            onAction={refetch}
          />
        )}

        {user && myStatus && viewState === 'confirmed_paid' && (
          <ConfirmedPaidView
            game={game}
            myStatus={myStatus}
            players={players}
            userId={user.id}
          />
        )}
      </div>
    </div>
  )
}
