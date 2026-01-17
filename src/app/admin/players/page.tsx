'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SkillRatingEditor } from '@/components/admin/SkillRatingEditor'
import { Loader2, Shield, ShieldOff, Trash2 } from 'lucide-react'
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

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'super_admin':
      return 'default'
    case 'admin':
      return 'secondary'
    default:
      return 'outline'
  }
}

function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin'
    case 'admin':
      return 'Admin'
    default:
      return 'Player'
  }
}

export default function PlayersPage() {
  const { profile } = useAuth()
  const [players, setPlayers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null)

  const supabase = createClient()
  const isSuperAdmin = profile?.role === 'super_admin'

  const fetchPlayers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name')

      if (fetchError) throw fetchError

      setPlayers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [])

  const handlePromoteToAdmin = async (playerId: string) => {
    setActionLoading(playerId)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', playerId)

      if (updateError) throw updateError

      await fetchPlayers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to promote player')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDemoteToPlayer = async (playerId: string) => {
    if (playerId === profile?.id) {
      alert('You cannot demote yourself')
      return
    }

    setActionLoading(playerId)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'player' })
        .eq('id', playerId)

      if (updateError) throw updateError

      await fetchPlayers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to demote admin')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeletePlayer = async () => {
    if (!deletePlayerId) return

    setActionLoading(deletePlayerId)
    try {
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletePlayerId)

      if (deleteError) throw deleteError

      await fetchPlayers()
      setDeletePlayerId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete player')
      setActionLoading(null)
    }
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Player Management</h1>
        <p className="text-gray-600 mt-2">Manage player profiles, skill ratings, and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Players ({players.length})</CardTitle>
          <CardDescription>View and edit player information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">WhatsApp</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Skill Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Games</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Credits</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Strikes</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Cool Off</th>
                  {isSuperAdmin && (
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{player.display_name}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{player.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{player.whatsapp_name}</td>
                    <td className="py-3 px-4">
                      <SkillRatingEditor
                        playerId={player.id}
                        currentRating={player.skill_rating}
                        onUpdate={fetchPlayers}
                      />
                    </td>
                    <td className="py-3 px-4">
                      {player.is_permanent_keeper ? (
                        <Badge variant="outline">Keeper</Badge>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(player.role)}>
                          {getRoleDisplayName(player.role)}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm">
                        <div className="font-medium">{player.total_games_played}</div>
                        <div className="text-xs text-gray-500">
                          {player.weeks_since_last_played}w ago
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div
                        className={`font-medium ${
                          player.credit_balance > 0 ? 'text-green-600' : 'text-gray-600'
                        }`}
                      >
                        {formatCurrency(player.credit_balance)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={player.withdrawal_strikes > 0 ? 'destructive' : 'outline'}
                      >
                        {player.withdrawal_strikes}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {player.strike_cooldown_until && new Date(player.strike_cooldown_until) > new Date() ? (
                        <div>
                          <Badge variant="destructive">Active</Badge>
                          <div className="text-xs text-gray-500 mt-1">
                            Until {new Date(player.strike_cooldown_until).toLocaleDateString()}
                          </div>
                        </div>
                      ) : null}
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {player.role === 'player' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePromoteToAdmin(player.id)}
                              disabled={actionLoading === player.id}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Promote
                            </Button>
                          ) : player.role === 'admin' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDemoteToPlayer(player.id)}
                              disabled={actionLoading === player.id || player.id === profile?.id}
                            >
                              <ShieldOff className="h-4 w-4 mr-1" />
                              Demote
                            </Button>
                          ) : null}

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeletePlayerId(player.id)}
                            disabled={actionLoading === player.id || player.id === profile?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePlayerId} onOpenChange={() => setDeletePlayerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Player?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this player and all their associated data. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlayer} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
