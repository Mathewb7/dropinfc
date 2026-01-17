'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, AlertTriangle, UserPlus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface StrikeSettings {
  id: number
  strikes_before_cooldown: number
  cooldown_weeks: number
  updated_at: string
}

interface PlayerInCooldown {
  id: string
  display_name: string
  email: string
  withdrawal_strikes: number
  strike_cooldown_until: string
}

interface Player {
  id: string
  display_name: string
  email: string
  withdrawal_strikes: number
}

export default function StrikesPage() {
  const { profile } = useAuth()
  const [settings, setSettings] = useState<StrikeSettings | null>(null)
  const [strikesBeforeCooldown, setStrikesBeforeCooldown] = useState(3)
  const [cooldownWeeks, setCooldownWeeks] = useState(3)
  const [playersInCooldown, setPlayersInCooldown] = useState<PlayerInCooldown[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingStrike, setAddingStrike] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const fetchSettings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('strike_settings')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (!data) {
        // No settings exist - create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from('strike_settings')
          .insert({ strikes_before_cooldown: 3, cooldown_weeks: 3 })
          .select()
          .single()

        if (insertError) throw insertError
        setSettings(newSettings)
        setStrikesBeforeCooldown(newSettings.strikes_before_cooldown)
        setCooldownWeeks(newSettings.cooldown_weeks)
        return
      }

      setSettings(data)
      setStrikesBeforeCooldown(data.strikes_before_cooldown)
      setCooldownWeeks(data.cooldown_weeks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    }
  }

  const fetchPlayersInCooldown = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, display_name, email, withdrawal_strikes, strike_cooldown_until')
        .not('strike_cooldown_until', 'is', null)
        .gt('strike_cooldown_until', new Date().toISOString())
        .order('strike_cooldown_until', { ascending: true })

      if (fetchError) throw fetchError

      setPlayersInCooldown(data || [])
    } catch (err) {
      console.error('Failed to fetch players in cooldown:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllPlayers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, display_name, email, withdrawal_strikes')
        .eq('role', 'player')
        .order('display_name')

      if (fetchError) throw fetchError

      setAllPlayers(data || [])
    } catch (err) {
      console.error('Failed to fetch players:', err)
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchPlayersInCooldown()
    fetchAllPlayers()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate inputs
      if (strikesBeforeCooldown < 1 || strikesBeforeCooldown > 10) {
        throw new Error('Strikes must be between 1 and 10')
      }
      if (cooldownWeeks < 1 || cooldownWeeks > 52) {
        throw new Error('Cooldown weeks must be between 1 and 52')
      }

      // Update settings
      const { error: updateError } = await supabase
        .from('strike_settings')
        .update({
          strikes_before_cooldown: strikesBeforeCooldown,
          cooldown_weeks: cooldownWeeks,
          updated_at: new Date().toISOString(),
          updated_by: profile?.id,
        })
        .eq('id', settings?.id)

      if (updateError) throw updateError

      setSuccess(true)
      await fetchSettings()
      await fetchPlayersInCooldown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleManualStrike = async () => {
    if (!selectedPlayer || !settings) return

    setAddingStrike(true)
    setError(null)
    setSuccess(false)

    try {
      // Get current player data
      const { data: player, error: fetchError } = await supabase
        .from('profiles')
        .select('withdrawal_strikes')
        .eq('id', selectedPlayer)
        .single()

      if (fetchError) throw fetchError

      const newStrikeCount = (player.withdrawal_strikes || 0) + 1

      // Add strike
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          withdrawal_strikes: newStrikeCount,
        })
        .eq('id', selectedPlayer)

      if (updateError) throw updateError

      // Check if this triggers cooldown
      if (newStrikeCount >= settings.strikes_before_cooldown) {
        const { error: cooldownError } = await supabase
          .from('profiles')
          .update({
            strike_cooldown_until: new Date(Date.now() + settings.cooldown_weeks * 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', selectedPlayer)

        if (cooldownError) throw cooldownError
      }

      setSuccess(true)
      setSelectedPlayer('')
      await fetchPlayersInCooldown()
      await fetchAllPlayers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add strike')
    } finally {
      setAddingStrike(false)
    }
  }

  const handleClearCooldown = async (playerId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          withdrawal_strikes: 0,
          strike_cooldown_until: null,
        })
        .eq('id', playerId)

      if (updateError) throw updateError

      await fetchPlayersInCooldown()
      await fetchAllPlayers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to clear cooldown')
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
        <h1 className="text-3xl font-bold">Strike System Settings</h1>
        <p className="text-gray-600 mt-2">Configure withdrawal strike penalties and cooldown periods</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>Settings saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Strike Configuration</CardTitle>
          <CardDescription>
            Set how many strikes trigger a cooldown and how long the cooldown lasts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="strikes">Strikes Before Cooldown</Label>
              <Input
                id="strikes"
                type="number"
                min="1"
                max="10"
                value={strikesBeforeCooldown}
                onChange={(e) => setStrikesBeforeCooldown(parseInt(e.target.value) || 1)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Number of withdrawal strikes before player enters cooldown (1-10)
              </p>
            </div>

            <div>
              <Label htmlFor="weeks">Cooldown Duration (Weeks)</Label>
              <Input
                id="weeks"
                type="number"
                min="1"
                max="52"
                value={cooldownWeeks}
                onChange={(e) => setCooldownWeeks(parseInt(e.target.value) || 1)}
              />
              <p className="mt-1 text-xs text-gray-500">
                How many weeks players are in cooldown (1-52)
              </p>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Changing these settings will NOT affect players already in cooldown.
              Their cooldown period remains at the duration when it was applied. New strikes will use the updated settings.
            </AlertDescription>
          </Alert>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Strike Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Add Manual Strike</CardTitle>
          <CardDescription>
            Manually assign a strike to a player (will trigger cooldown if threshold reached)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="player-select">Select Player</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger id="player-select">
                  <SelectValue placeholder="Choose a player..." />
                </SelectTrigger>
                <SelectContent>
                  {allPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.display_name} - {player.withdrawal_strikes} strikes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleManualStrike}
              disabled={!selectedPlayer || addingStrike}
            >
              {addingStrike ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Strike
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Players in Cooldown */}
      <Card>
        <CardHeader>
          <CardTitle>Players Currently in Cooldown ({playersInCooldown.length})</CardTitle>
          <CardDescription>Players who are temporarily banned from joining games</CardDescription>
        </CardHeader>
        <CardContent>
          {playersInCooldown.length > 0 ? (
            <div className="space-y-3">
              {playersInCooldown.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{player.display_name}</div>
                    <div className="text-sm text-gray-600">{player.email}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {player.withdrawal_strikes} strikes • Cooldown until{' '}
                      {new Date(player.strike_cooldown_until).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClearCooldown(player.id)}
                  >
                    Clear Cooldown
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No players currently in cooldown</p>
          )}
        </CardContent>
      </Card>

      {/* How Strikes Work */}
      <Card>
        <CardHeader>
          <CardTitle>How the Strike System Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p><strong>Players receive strikes for:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Withdrawing within 24 hours of game time (manual strike - use dropdown above)</li>
            <li>Not paying by payment deadline (automatic strike when removed from game)</li>
          </ul>
          <p className="mt-4"><strong>Current configuration:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>After <strong>{strikesBeforeCooldown} strikes</strong>, player enters cooldown</li>
            <li>Cooldown lasts <strong>{cooldownWeeks} weeks</strong> from the strike date</li>
            <li>During cooldown, player cannot join any games</li>
            <li>Strikes reset to 0 when the cooldown period ends</li>
          </ul>
          <p className="mt-4"><strong>How to apply manual strikes:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>For late withdrawals (within 24hrs): Use the "Add Manual Strike" dropdown above</li>
            <li>The system will automatically check if the strike triggers a cooldown</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
