'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield, ShieldOff, Search } from 'lucide-react'

export default function AdminsPage() {
  const { profile } = useAuth()
  const [admins, setAdmins] = useState<Profile[]>([])
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  // Check if current user is super admin
  if (profile?.role !== 'super_admin') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Management</h1>
          <p className="text-gray-600 mt-2">Access Denied</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Only super admins can access this page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const fetchAdmins = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'super_admin'])
        .order('display_name')

      if (fetchError) throw fetchError

      setAdmins(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admins')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const handleSearch = async () => {
    if (!searchEmail.trim()) return

    setSearching(true)
    setError(null)
    setSearchResults([])

    try {
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', `%${searchEmail.trim()}%`)
        .eq('role', 'player')
        .limit(10)

      if (searchError) throw searchError

      setSearchResults(data || [])
      if (data?.length === 0) {
        setError('No players found with that email')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search players')
    } finally {
      setSearching(false)
    }
  }

  const handlePromote = async (playerId: string) => {
    setActionLoading(playerId)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', playerId)

      if (updateError) throw updateError

      setSuccess('Player promoted to admin successfully!')
      setSearchResults([])
      setSearchEmail('')
      await fetchAdmins()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote player')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDemote = async (adminId: string) => {
    if (adminId === profile?.id) {
      setError('You cannot demote yourself')
      return
    }

    setActionLoading(adminId)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'player' })
        .eq('id', adminId)

      if (updateError) throw updateError

      setSuccess('Admin demoted to player successfully!')
      await fetchAdmins()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to demote admin')
    } finally {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Management</h1>
        <p className="text-gray-600 mt-2">Manage admin users (Super Admin Only)</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Current Admins */}
      <Card>
        <CardHeader>
          <CardTitle>Current Admins ({admins.length})</CardTitle>
          <CardDescription>Users with admin or super admin privileges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  <div>
                    <div className="font-medium">{admin.display_name}</div>
                    <div className="text-sm text-gray-600">{admin.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                    {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </Badge>
                  {admin.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDemote(admin.id)}
                      disabled={actionLoading === admin.id}
                    >
                      {actionLoading === admin.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ShieldOff className="h-4 w-4 mr-1" />
                          Demote
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Promote Players to Admin */}
      <Card>
        <CardHeader>
          <CardTitle>Promote Player to Admin</CardTitle>
          <CardDescription>Search for a player by email and promote them</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="search-email">Player Email</Label>
              <Input
                id="search-email"
                type="email"
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={searching || !searchEmail.trim()}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="text-sm font-medium text-gray-700">Search Results:</div>
              {searchResults.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{player.display_name}</div>
                    <div className="text-sm text-gray-600">{player.email}</div>
                    <div className="text-xs text-gray-500">
                      {player.total_games_played} games played
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePromote(player.id)}
                    disabled={actionLoading === player.id}
                  >
                    {actionLoading === player.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-1" />
                        Promote to Admin
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
