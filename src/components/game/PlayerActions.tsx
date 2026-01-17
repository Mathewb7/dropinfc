'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Game, GamePlayer } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Check, X, UserPlus, DollarSign, LogOut } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PAYMENT } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

interface PlayerActionsProps {
  game: Game
  myStatus: GamePlayer | null
  userId: string
  onAction: () => void
}

const CONFIRMED_STATUSES = ['priority_confirmed', 'lottery_selected', 'confirmed'] as const
const PAID_STATUSES = ['verified', 'marked_paid'] as const

function isConfirmedStatus(status: string): boolean {
  return CONFIRMED_STATUSES.includes(status as typeof CONFIRMED_STATUSES[number])
}

function isPaidStatus(status: string | undefined): boolean {
  return status !== undefined && PAID_STATUSES.includes(status as typeof PAID_STATUSES[number])
}

/**
 * Action buttons for players based on their current status
 */
export function PlayerActions({ game, myStatus, userId, onAction }: PlayerActionsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showJoinGameDialog, setShowJoinGameDialog] = useState(false)
  const { toast} = useToast()

  const supabase = createClient()

  async function handleConfirm(): Promise<void> {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('game_players')
        .update({
          status: 'priority_confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('game_id', game.id)
        .eq('player_id', userId)

      if (error) throw error

      toast({
        title: "Confirmed!",
        description: "You've successfully confirmed your attendance for this game.",
      })
      onAction()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm')
    } finally {
      setLoading(false)
    }
  }

  async function handleDecline(): Promise<void> {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('game_players')
        .update({ status: 'priority_declined' })
        .eq('game_id', game.id)
        .eq('player_id', userId)

      if (error) throw error

      toast({
        title: "Declined",
        description: "You've declined the invitation for this game.",
      })
      onAction()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinGame(): Promise<void> {
    setLoading(true)
    setError(null)

    try {
      // 1. Check strike cooldown
      const { data: canJoin } = await supabase.rpc('can_join_game', {
        p_player_id: userId,
      })

      if (!canJoin) {
        setError('You are on strike cooldown and cannot join games yet')
        setLoading(false)
        return
      }

      // 2. Check if already registered
      const { data: existing } = await supabase
        .from('game_players')
        .select('id, status')
        .eq('game_id', game.id)
        .eq('player_id', userId)
        .single()

      if (existing) {
        setError('You are already registered for this game')
        setLoading(false)
        return
      }

      // 3. Check if game is full (race condition protection)
      const { data: spotData } = await supabase
        .from('game_spots_available')
        .select('available_spots')
        .eq('game_id', game.id)
        .single()

      if (!spotData || spotData.available_spots <= 0) {
        setError('Game is full! All spots have been taken.')
        setLoading(false)
        return
      }

      // 4. Attempt to join (first INSERT wins if multiple people try)
      const { error: insertError } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          player_id: userId,
          status: 'lottery_selected', // Repurposed to mean "FCFS joined"
          joined_waitlist_at: new Date().toISOString(), // Keep for historical data
          confirmed_at: new Date().toISOString(), // Instant confirmation
          payment_status: 'pending',
        })

      if (insertError) {
        // Check if it's a game-full error
        if (insertError.message?.includes('full') || insertError.message?.includes('spots')) {
          setError('Game is full! Someone else just took the last spot.')
        } else {
          throw insertError
        }
        setLoading(false)
        return
      }

      toast({
        title: "You're In!",
        description: "You've successfully joined the game! Please pay by Saturday 11:59pm.",
      })
      setShowJoinGameDialog(false)
      await onAction()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game')
    } finally {
      setLoading(false)
    }
  }

  async function handleRejoinGame(): Promise<void> {
    setLoading(true)
    setError(null)

    try {
      const { data: canJoin } = await supabase.rpc('can_join_game', {
        p_player_id: userId,
      })

      if (!canJoin) {
        setError('You are on strike cooldown and cannot join games yet')
        setLoading(false)
        return
      }

      if (game.status !== 'waitlist_open') {
        setError('Game registration is currently closed')
        setLoading(false)
        return
      }

      // Check if game is full
      const { data: spotData } = await supabase
        .from('game_spots_available')
        .select('available_spots')
        .eq('game_id', game.id)
        .single()

      if (!spotData || spotData.available_spots <= 0) {
        setError('Game is full! All spots have been taken.')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('game_players')
        .update({
          status: 'lottery_selected', // Repurposed to mean "FCFS joined"
          joined_waitlist_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
          payment_status: 'pending',
        })
        .eq('game_id', game.id)
        .eq('player_id', userId)

      if (error) throw error

      toast({
        title: "You're In!",
        description: "You've successfully joined the game! Please pay by Saturday 11:59pm.",
      })
      setShowJoinGameDialog(false)
      await onAction()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rejoin game')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPaid(): Promise<void> {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('game_players')
        .update({
          payment_status: 'marked_paid',
          paid_at: new Date().toISOString(),
        })
        .eq('game_id', game.id)
        .eq('player_id', userId)

      if (error) throw error

      toast({
        title: "Payment Marked!",
        description: "Your payment has been marked. An admin will verify it soon.",
      })
      setShowPaymentDialog(false)
      onAction()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as paid')
    } finally {
      setLoading(false)
    }
  }

  async function handleWithdraw(): Promise<void> {
    setLoading(true)
    setError(null)

    try {
      const hasPaid = isPaidStatus(myStatus?.payment_status)

      // Update status to withdrawn
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          status: 'withdrawn',
        })
        .eq('game_id', game.id)
        .eq('player_id', userId)

      if (updateError) throw updateError

      // If player had paid, add credit
      if (hasPaid) {
        // Create credit transaction
        const { error: creditError } = await supabase
          .from('credit_transactions')
          .insert({
            player_id: userId,
            game_id: game.id,
            amount: PAYMENT.REFUND_CREDIT_AMOUNT,
            type: 'credit_added',
            notes: 'Credit for withdrawing from paid game',
          })

        if (creditError) throw creditError

        // Update player's credit balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('credit_balance')
          .eq('id', userId)
          .single()

        if (profile) {
          const { error: balanceError } = await supabase
            .from('profiles')
            .update({
              credit_balance: (profile.credit_balance || 0) + PAYMENT.REFUND_CREDIT_AMOUNT
            })
            .eq('id', userId)

          if (balanceError) throw balanceError
        }
      }

      toast({
        title: "Withdrawn",
        description: hasPaid
          ? `You've withdrawn from the game. ${formatCurrency(PAYMENT.REFUND_CREDIT_AMOUNT)} credit has been added to your account.`
          : "You've withdrawn from the game.",
      })
      setShowWithdrawDialog(false)
      await onAction() // Wait for refetch to complete
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw')
    } finally {
      setLoading(false) // Always reset loading state
    }
  }

  function renderActions(): React.ReactNode {
    // 1. In-game + paid players → Show nothing (handled in parent component)
    if (myStatus && isConfirmedStatus(myStatus.status) && isPaidStatus(myStatus.payment_status)) {
      return null
    }

    // 2. Priority invited (before deadline) → Join Game / Cannot Come
    if (myStatus?.status === 'priority_invited') {
      return (
        <div className="flex gap-2">
          <Button onClick={handleConfirm} disabled={loading} size="lg" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Join Game
          </Button>
          <Button onClick={handleDecline} disabled={loading} variant="outline" size="lg" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Cannot Come
          </Button>
        </div>
      )
    }

    // 3. Priority confirmed OR FCFS joined (waiting to pay) → Payment + Withdraw
    if (
      (myStatus?.status === 'priority_confirmed' || myStatus?.status === 'lottery_selected') &&
      myStatus?.payment_status === 'pending'
    ) {
      return (
        <div className="flex gap-2">
          <Button onClick={() => setShowPaymentDialog(true)} disabled={loading} className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Mark Payment Sent
          </Button>
          <Button onClick={() => setShowWithdrawDialog(true)} disabled={loading} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Withdraw from Game
          </Button>
        </div>
      )
    }

    // 4. Declined or withdrawn → Show Join Game button if slots available
    if ((myStatus?.status === 'priority_declined' || myStatus?.status === 'withdrawn') && game.status === 'waitlist_open') {
      return (
        <Button onClick={() => setShowJoinGameDialog(true)} disabled={loading} size="lg" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Join Game
        </Button>
      )
    }

    // 5. Not registered → Show Join Game button
    if (!myStatus && game.status === 'waitlist_open') {
      return (
        <Button onClick={() => setShowJoinGameDialog(true)} disabled={loading} size="lg" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Join Game
        </Button>
      )
    }

    // Remove old waitlist case - no longer needed

    // Default: No actions
    return null
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {renderActions()}

      {/* Payment Confirmation Dialog */}
      <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark payment as sent? An admin will verify it soon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkPaid}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw from Game?</AlertDialogTitle>
            <AlertDialogDescription>
              {myStatus?.payment_status === 'verified' || myStatus?.payment_status === 'marked_paid'
                ? `You've already paid. Withdrawing will add ${formatCurrency(PAYMENT.REFUND_CREDIT_AMOUNT)} credit to your account for next game. Are you sure?`
                : "Are you sure you want to withdraw from this game? This may affect your lottery priority."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw}>
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Join Game Confirmation Dialog */}
      <AlertDialog open={showJoinGameDialog} onOpenChange={setShowJoinGameDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Join This Game?</AlertDialogTitle>
            <AlertDialogDescription>
              {myStatus?.status === 'priority_declined' || myStatus?.status === 'withdrawn'
                ? "Are you sure you want to join this game? You'll need to pay $15 by Saturday 11:59pm."
                : "First come, first served! You'll need to pay $15 by Saturday 11:59pm."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={myStatus?.status === 'priority_declined' || myStatus?.status === 'withdrawn' ? handleRejoinGame : handleJoinGame}>
              Confirm - Join Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
