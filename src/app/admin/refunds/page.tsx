'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, XCircle, HandCoins } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface RefundRequest {
  id: string
  player_id: string
  game_id: string
  amount: number
  reason: string | null
  status: 'pending' | 'approved' | 'denied'
  admin_notes: string | null
  created_at: string
  player: {
    id: string
    display_name: string
    email: string
  }
  game: {
    id: string
    game_date: string
  }
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  const fetchRefunds = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('refund_requests')
        .select(`
          *,
          player:profiles!refund_requests_player_id_fkey(id, display_name, email),
          game:games(id, game_date)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setRefunds(data as any || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch refunds')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRefunds()
  }, [])

  const handleApprove = async (refund: RefundRequest) => {
    setActionLoading(refund.id)
    setError(null)
    setSuccess(null)

    try {
      const isCreditWithdrawal = !refund.game_id // NULL game_id means credit balance withdrawal

      if (isCreditWithdrawal) {
        // Credit balance withdrawal - deduct from balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('credit_balance')
          .eq('id', refund.player_id)
          .single()

        if (!profile) throw new Error('Player profile not found')

        // Deduct credit balance
        await supabase
          .from('profiles')
          .update({ credit_balance: (profile.credit_balance || 0) - refund.amount })
          .eq('id', refund.player_id)

        // Create transaction record (negative amount)
        await supabase.from('credit_transactions').insert({
          player_id: refund.player_id,
          game_id: null,
          amount: -refund.amount,
          type: 'refund_completed',
          notes: `Withdrawal sent: ${adminNotes[refund.id] || refund.reason || 'Withdrawal processed'}`,
        })
      } else {
        // Game refund - add credit
        const { error: creditError } = await supabase.from('credit_transactions').insert({
          player_id: refund.player_id,
          game_id: refund.game_id,
          amount: refund.amount,
          type: 'credit_added',
          notes: `Game refund approved: ${adminNotes[refund.id] || refund.reason || 'No reason provided'}`,
        })

        if (creditError) throw creditError

        // Update player credit balance (add)
        const { data: profile } = await supabase
          .from('profiles')
          .select('credit_balance')
          .eq('id', refund.player_id)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({ credit_balance: (profile.credit_balance || 0) + refund.amount })
            .eq('id', refund.player_id)
        }
      }

      // Update refund request status
      const { error: updateError } = await supabase
        .from('refund_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes[refund.id] || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', refund.id)

      if (updateError) throw updateError

      const message = isCreditWithdrawal
        ? `Credit withdrawal approved! ${formatCurrency(refund.amount)} will be sent to player.`
        : `Refund approved! ${formatCurrency(refund.amount)} credit added to player account.`

      setSuccess(message)
      await fetchRefunds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve refund')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeny = async (refund: RefundRequest) => {
    setActionLoading(refund.id)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('refund_requests')
        .update({
          status: 'denied',
          admin_notes: adminNotes[refund.id] || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', refund.id)

      if (updateError) throw updateError

      setSuccess('Request denied.')
      await fetchRefunds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny request')
    } finally {
      setActionLoading(null)
    }
  }

  const pendingRefunds = refunds.filter((r) => r.status === 'pending')
  const processedRefunds = refunds.filter((r) => r.status !== 'pending')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Refund Requests</h1>
        <p className="text-gray-600 mt-2">Review and process player refund requests</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Pending Refunds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5" />
            Pending Refunds ({pendingRefunds.length})
          </CardTitle>
          <CardDescription>Refund requests waiting for review</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRefunds.length > 0 ? (
            <div className="space-y-4">
              {pendingRefunds.map((refund) => (
                <div key={refund.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-lg">{refund.player.display_name}</div>
                      <div className="text-sm text-gray-600">{refund.player.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {refund.game ? (
                          <>Game: {new Date(refund.game.game_date).toLocaleDateString()}</>
                        ) : (
                          <>Type: Credit Balance Withdrawal</>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(refund.amount)}
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </div>

                  {refund.reason && (
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs font-medium text-gray-600 mb-1">Player's Reason:</div>
                      <div className="text-sm">{refund.reason}</div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor={`notes-${refund.id}`}>Admin Notes (Optional)</Label>
                    <Textarea
                      id={`notes-${refund.id}`}
                      placeholder="Add internal notes about this refund..."
                      value={adminNotes[refund.id] || ''}
                      onChange={(e) =>
                        setAdminNotes({ ...adminNotes, [refund.id]: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(refund)}
                      disabled={actionLoading === refund.id}
                      className="flex-1"
                    >
                      {actionLoading === refund.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      {refund.game_id ? 'Approve & Add Credit' : 'Approve & Send Funds'}
                    </Button>
                    <Button
                      onClick={() => handleDeny(refund)}
                      disabled={actionLoading === refund.id}
                      variant="outline"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No pending refund requests</p>
          )}
        </CardContent>
      </Card>

      {/* Processed Refunds */}
      {processedRefunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processed Refunds ({processedRefunds.length})</CardTitle>
            <CardDescription>Previously approved or denied refund requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedRefunds.map((refund) => (
                <div
                  key={refund.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{refund.player.display_name}</div>
                    <div className="text-sm text-gray-600">
                      {refund.game ? (
                        <>{new Date(refund.game.game_date).toLocaleDateString()} •{' '}</>
                      ) : (
                        <>Credit Withdrawal •{' '}</>
                      )}
                      {formatCurrency(refund.amount)}
                    </div>
                    {refund.admin_notes && (
                      <div className="text-xs text-gray-500 mt-1">
                        Notes: {refund.admin_notes}
                      </div>
                    )}
                  </div>
                  <Badge variant={refund.status === 'approved' ? 'default' : 'destructive'}>
                    {refund.status === 'approved' ? 'Approved' : 'Denied'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
