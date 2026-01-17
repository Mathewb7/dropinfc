'use client'

import { useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { createClient } from '@/lib/supabase/client'
import { GamePlayer } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, DollarSign } from 'lucide-react'
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
import { formatCurrency } from '@/lib/utils'
import { PAYMENT } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'

export default function PaymentsPage() {
  const { game, players, loading, error, refetch } = useGame()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [markUnpaidPlayer, setMarkUnpaidPlayer] = useState<GamePlayer | null>(null)
  const { toast } = useToast()

  const supabase = createClient()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!game) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payment Tracking</h1>
          <p className="text-gray-600 mt-2">No game scheduled</p>
        </div>
      </div>
    )
  }

  // Filter confirmed players who need to pay
  const confirmedPlayers = players.filter(
    (p) =>
      p.status === 'priority_confirmed' ||
      p.status === 'lottery_selected' ||
      p.status === 'confirmed'
  )

  const paidPlayers = confirmedPlayers.filter((p) => p.payment_status === 'verified')
  const markedPaidPlayers = confirmedPlayers.filter((p) => p.payment_status === 'marked_paid')
  const unpaidPlayers = confirmedPlayers.filter((p) => p.payment_status === 'pending')

  const handleVerifyPayment = async (playerId: string) => {
    setActionLoading(playerId)

    try {
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          payment_status: 'verified',
          paid_at: new Date().toISOString(),
        })
        .eq('game_id', game.id)
        .eq('player_id', playerId)

      if (updateError) throw updateError

      toast({
        title: "Payment Verified",
        description: "Player's payment has been verified successfully.",
      })
      await refetch()
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to verify payment',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkUnpaid = async () => {
    if (!markUnpaidPlayer) return

    setActionLoading(markUnpaidPlayer.player_id)

    try {
      // Remove player from game
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          status: 'removed_nonpayment',
          payment_status: 'pending',
        })
        .eq('game_id', game.id)
        .eq('player_id', markUnpaidPlayer.player_id)

      if (updateError) throw updateError

      // Admin will need to manually run lottery to fill the slot
      // and decide whether to add a withdrawal strike

      toast({
        title: "Player Removed",
        description: "Player has been removed for non-payment. You may need to run the lottery to fill the spot.",
      })
      setMarkUnpaidPlayer(null)
      await refetch()
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to mark unpaid',
      })
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Tracking</h1>
        <p className="text-gray-600 mt-2">Monitor and verify player payments</p>
      </div>

      {/* Paid Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Verified Payments ({paidPlayers.length})
          </CardTitle>
          <CardDescription>Players whose payment has been verified</CardDescription>
        </CardHeader>
        <CardContent>
          {paidPlayers.length > 0 ? (
            <div className="space-y-2">
              {paidPlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">{p.player.display_name}</div>
                      <div className="text-sm text-gray-600">{p.player.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="bg-green-600">
                      Verified
                    </Badge>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(PAYMENT.GAME_FEE)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No verified payments yet</p>
          )}
        </CardContent>
      </Card>

      {/* Pending Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-yellow-600" />
            Pending Verification ({markedPaidPlayers.length})
          </CardTitle>
          <CardDescription>Players who marked themselves as paid</CardDescription>
        </CardHeader>
        <CardContent>
          {markedPaidPlayers.length > 0 ? (
            <div className="space-y-2">
              {markedPaidPlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                    <div>
                      <div className="font-medium">{p.player.display_name}</div>
                      <div className="text-sm text-gray-600">{p.player.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-yellow-500">Marked Paid</Badge>
                    <div className="font-semibold">{formatCurrency(PAYMENT.GAME_FEE)}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleVerifyPayment(p.player_id)}
                        disabled={actionLoading === p.player_id}
                      >
                        {actionLoading === p.player_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMarkUnpaidPlayer(p)}
                        disabled={actionLoading === p.player_id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Mark Unpaid
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No payments pending verification</p>
          )}
        </CardContent>
      </Card>

      {/* Unpaid Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Not Paid ({unpaidPlayers.length})
          </CardTitle>
          <CardDescription>Players who have not paid yet</CardDescription>
        </CardHeader>
        <CardContent>
          {unpaidPlayers.length > 0 ? (
            <div className="space-y-2">
              {unpaidPlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-medium">{p.player.display_name}</div>
                      <div className="text-sm text-gray-600">{p.player.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive">Unpaid</Badge>
                    <div className="font-semibold">{formatCurrency(PAYMENT.GAME_FEE)}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMarkUnpaidPlayer(p)}
                      disabled={actionLoading === p.player_id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">All players have paid!</p>
          )}
        </CardContent>
      </Card>

      {/* Mark Unpaid Confirmation Dialog */}
      <AlertDialog open={!!markUnpaidPlayer} onOpenChange={() => setMarkUnpaidPlayer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player for Non-Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {markUnpaidPlayer?.player.display_name} from the game and open their
              slot for lottery selection. You may need to manually add a withdrawal strike if
              appropriate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkUnpaid} className="bg-red-600 hover:bg-red-700">
              Remove Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
