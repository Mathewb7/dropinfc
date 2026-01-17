'use client'

import { useState, useEffect, useRef } from 'react'
import { useGame } from '@/hooks/useGame'
import { createClient } from '@/lib/supabase/client'
import { Game } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Calendar, Users, DollarSign, AlertTriangle, CheckCircle, Shuffle, Share2, XCircle } from 'lucide-react'
import { formatGameDate, formatTime, timeUntil } from '@/lib/utils'
import { GAME_CONFIG, TEAM_COLORS } from '@/lib/constants'
import { toJpeg } from 'html-to-image'
import Link from 'next/link'

interface TeamAssignment {
  player_id: string
  team: 'dark' | 'light'
  position?: 'keeper' | 'field'
  is_starting?: boolean
}

export default function AdminDashboard() {
  const { game, players, loading, error, refetch } = useGame()
  const [updating, setUpdating] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Player management
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [removingPlayer, setRemovingPlayer] = useState<string | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [playerToRemove, setPlayerToRemove] = useState<{ id: string; name: string } | null>(null)

  // Spot availability tracking
  const [availableSpots, setAvailableSpots] = useState(0)
  const [filledSpots, setFilledSpots] = useState(0)

  // Team balancing
  const [teams, setTeams] = useState<TeamAssignment[]>([])
  const [generating, setGenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Lineup generation
  const [generatingLineup, setGeneratingLineup] = useState(false)
  const lineupRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  // Fetch all profiles for the add player dropdown
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoadingProfiles(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .order('display_name')

        if (error) throw error
        setAllProfiles(data || [])
      } catch (err) {
        console.error('Failed to fetch profiles:', err)
      } finally {
        setLoadingProfiles(false)
      }
    }

    fetchProfiles()
  }, [])

  // Fetch spot availability
  useEffect(() => {
    if (!game) return

    const fetchSpots = async () => {
      const { data } = await supabase
        .from('game_spots_available')
        .select('available_spots, filled_spots')
        .eq('game_id', game.id)
        .single()

      if (data) {
        setAvailableSpots(data.available_spots)
        setFilledSpots(data.filled_spots)
      }
    }

    fetchSpots()
  }, [game, players])

  const handleAddPlayer = async () => {
    if (!game || !selectedPlayerId) return

    setAddingPlayer(true)
    setLocalError(null)
    setSuccess(null)

    try {
      // Check if player already in game
      const existing = players.find(p => p.player_id === selectedPlayerId)
      if (existing) {
        throw new Error('Player is already in this game')
      }

      // Add player to game with waitlist status
      const { error: insertError } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          player_id: selectedPlayerId,
          status: 'lottery_selected',
          payment_status: 'pending'
        })

      if (insertError) throw insertError

      setSuccess('Player added to game successfully')
      setSelectedPlayerId('')
      await refetch()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to add player')
    } finally {
      setAddingPlayer(false)
    }
  }

  const handleRemovePlayerClick = (playerId: string, playerName: string) => {
    setPlayerToRemove({ id: playerId, name: playerName })
    setShowRemoveDialog(true)
  }

  const handleConfirmRemovePlayer = async () => {
    if (!game || !playerToRemove) return

    setRemovingPlayer(playerToRemove.id)
    setLocalError(null)
    setSuccess(null)

    try {
      const { error: deleteError } = await supabase
        .from('game_players')
        .delete()
        .eq('game_id', game.id)
        .eq('player_id', playerToRemove.id)

      if (deleteError) throw deleteError

      setSuccess('Player removed from game')
      setShowRemoveDialog(false)
      setPlayerToRemove(null)
      await refetch()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to remove player')
    } finally {
      setRemovingPlayer(null)
    }
  }

  const handleRemoveNonPayer = async (gamePlayerId: string, playerName: string) => {
    if (!game) return

    setLocalError(null)
    setSuccess(null)

    try {
      const { error } = await supabase
        .from('game_players')
        .update({ status: 'removed_nonpayment' })
        .eq('id', gamePlayerId)

      if (error) throw error

      setSuccess(`${playerName} removed. Spot is now available. Copy "Spot Reopened" message from Messages page.`)
      await refetch()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to remove non-payer')
    }
  }

  const handleCancelGame = async () => {
    if (!game) return

    setCancelling(true)
    setLocalError(null)
    setSuccess(null)

    try {
      // Get priority players from current game
      const { data: priorityPlayers, error: fetchError } = await supabase
        .from('game_players')
        .select('player_id')
        .eq('game_id', game.id)
        .eq('status', 'priority_invited')

      if (fetchError) throw fetchError

      // Delete the game (cascade will delete game_players)
      const { error: deleteError } = await supabase
        .from('games')
        .delete()
        .eq('id', game.id)

      if (deleteError) throw deleteError

      // Create new game for next Tuesday (7 days later)
      const newGameDate = new Date(game.game_date)
      newGameDate.setDate(newGameDate.getDate() + 7)

      // Calculate new deadlines
      const priorityDeadline = new Date(newGameDate)
      priorityDeadline.setDate(priorityDeadline.getDate() - 5) // Thursday before
      priorityDeadline.setHours(12, 0, 0, 0)

      const paymentReminder = new Date(newGameDate)
      paymentReminder.setDate(paymentReminder.getDate() - 3) // Saturday before
      paymentReminder.setHours(18, 0, 0, 0)

      const paymentDeadline = new Date(newGameDate)
      paymentDeadline.setDate(paymentDeadline.getDate() - 3)
      paymentDeadline.setHours(23, 59, 0, 0)

      const { data: newGame, error: createError } = await supabase
        .from('games')
        .insert({
          game_date: newGameDate.toISOString(),
          status: 'priority_open',
          priority_deadline: priorityDeadline.toISOString(),
          payment_reminder_time: paymentReminder.toISOString(),
          payment_deadline: paymentDeadline.toISOString(),
          teams_announced: false,
        })
        .select()
        .single()

      if (createError) throw createError

      // Invite same priority players to new game
      if (priorityPlayers && priorityPlayers.length > 0 && newGame) {
        const invites = priorityPlayers.map((p) => ({
          game_id: newGame.id,
          player_id: p.player_id,
          status: 'priority_invited' as const,
          payment_status: 'pending' as const,
        }))

        const { error: inviteError } = await supabase
          .from('game_players')
          .insert(invites)

        if (inviteError) throw inviteError
      }

      setSuccess('Game cancelled and new game created for next week!')
      setShowCancelDialog(false)
      await refetch()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to cancel game')
    } finally {
      setCancelling(false)
    }
  }

  const handleGenerateTeams = async () => {
    if (!game) return
    setGenerating(true)
    setLocalError(null)
    setSuccess(null)

    try {
      const { data, error: balanceError } = await supabase.rpc('balance_teams', {
        p_game_id: game.id,
      })

      if (balanceError) throw balanceError

      setTeams(data || [])
      setSuccess('Teams generated! Assign positions and confirm.')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to generate teams')
    } finally {
      setGenerating(false)
    }
  }

  const updatePlayerAssignment = (playerId: string, field: string, value: any) => {
    setTeams((prev) =>
      prev.map((t) => (t.player_id === playerId ? { ...t, [field]: value } : t))
    )
  }

  const handleConfirmTeams = async () => {
    if (!game) return
    setConfirming(true)
    setLocalError(null)

    try {
      // Validate all players have positions
      const missingPositions = teams.filter((t) => !t.position || t.is_starting === undefined)
      if (missingPositions.length > 0) {
        throw new Error('Please assign positions to all players')
      }

      // Update all players
      const updatePromises = teams.map((t) =>
        supabase
          .from('game_players')
          .update({
            team: t.team,
            position: t.position,
            is_starting: t.is_starting,
          })
          .eq('game_id', game.id)
          .eq('player_id', t.player_id)
      )

      const results = await Promise.all(updatePromises)
      const failed = results.filter((r) => r.error)

      if (failed.length > 0) {
        throw new Error(`Failed to update ${failed.length} player(s)`)
      }

      // Mark teams as announced
      const { error: gameError } = await supabase
        .from('games')
        .update({ teams_announced: true })
        .eq('id', game.id)

      if (gameError) throw gameError

      setSuccess('Teams confirmed and announced!')
      setTeams([])
      await refetch()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to confirm teams')
    } finally {
      setConfirming(false)
    }
  }

  const getTeamPlayers = (team: 'dark' | 'light') => {
    if (!game) return []
    const confirmedPaidPlayers = players.filter(
      (p) =>
        (p.status === 'priority_confirmed' ||
          p.status === 'lottery_selected' ||
          p.status === 'confirmed') &&
        (p.payment_status === 'verified' || p.payment_status === 'marked_paid')
    )
    return teams
      .filter((t) => t.team === team)
      .map((t) => {
        const player = confirmedPaidPlayers.find((p) => p.player_id === t.player_id)
        return player ? { ...player, assignment: t } : null
      })
      .filter((p) => p !== null)
  }

  const getTeamSkillTotal = (team: 'dark' | 'light') => {
    return getTeamPlayers(team).reduce((sum, p) => sum + (p.player.skill_rating || 0), 0)
  }

  const handleDownloadLineup = async () => {
    if (!lineupRef.current || !game) return

    setGeneratingLineup(true)
    try {
      const dataUrl = await toJpeg(lineupRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#166534',
      })

      const filename = `dropin-fc-lineup-${formatGameDate(game.game_date)}.jpg`

      // Convert data URL to Blob for sharing
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], filename, { type: 'image/jpeg' })

      // Check if Web Share API is available and supports file sharing (mobile)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'DropIn FC Lineup',
          text: `Lineup for ${formatGameDate(game.game_date)}`,
        })
      } else {
        // Fallback to download for desktop browsers
        const link = document.createElement('a')
        link.download = filename
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      // User cancelled share dialog - not an error
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      console.error('Failed to generate/share image:', err)
      setLocalError('Failed to generate lineup image')
    } finally {
      setGeneratingLineup(false)
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

  if (!game) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage games, players, and payments</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Upcoming Game</CardTitle>
            <CardDescription>Games are automatically created every Wednesday at 08:00 for the next Tuesday</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                No upcoming game scheduled. Games are automatically created every Wednesday at 08:00 for the next Tuesday.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate player counts
  const confirmedPlayers = players.filter(
    (p) =>
      p.status === 'priority_confirmed' ||
      p.status === 'lottery_selected' ||
      p.status === 'confirmed'
  )
  const priorityPlayers = players.filter(
    (p) => p.status === 'priority_invited' || p.status === 'priority_confirmed' || p.status === 'priority_declined'
  )
  const priorityConfirmed = players.filter((p) => p.status === 'priority_confirmed')
  const priorityDeclined = players.filter((p) => p.status === 'priority_declined')
  const paidPlayers = players.filter(
    (p) => p.payment_status === 'verified' || p.payment_status === 'marked_paid'
  )
  const unpaidPlayers = confirmedPlayers.filter((p) => p.payment_status === 'pending')

  // Team-related calculations
  const confirmedPaidPlayers = players.filter(
    (p) =>
      (p.status === 'priority_confirmed' ||
        p.status === 'lottery_selected' ||
        p.status === 'confirmed') &&
      (p.payment_status === 'verified' || p.payment_status === 'marked_paid')
  )

  const darkTeam = getTeamPlayers('dark')
  const lightTeam = getTeamPlayers('light')

  // Lineup calculations (final teams after announcement)
  const darkTeamFinal = players.filter((p) => p.team === 'dark')
  const lightTeamFinal = players.filter((p) => p.team === 'light')

  const darkKeeper = darkTeamFinal.find((p) => p.position === 'keeper' && p.is_starting)
  const darkField = darkTeamFinal.filter((p) => p.position === 'field' && p.is_starting)
  const darkSubs = darkTeamFinal.filter((p) => !p.is_starting)

  const lightKeeper = lightTeamFinal.find((p) => p.position === 'keeper' && p.is_starting)
  const lightField = lightTeamFinal.filter((p) => p.position === 'field' && p.is_starting)
  const lightSubs = lightTeamFinal.filter((p) => !p.is_starting)

  const getStatusBadge = () => {
    switch (game.status) {
      case 'priority_open':
        return <Badge variant="default">Priority Window Open</Badge>
      case 'waitlist_open':
        return <Badge variant="secondary">Waitlist Open</Badge>
      case 'payment_pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Payment Pending</Badge>
      case 'teams_assigned':
        return <Badge className="bg-green-600 hover:bg-green-700">Teams Assigned</Badge>
      case 'completed':
        return <Badge variant="outline">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage games, players, and operations</p>
      </div>

      {/* Error/Success Alerts */}
      {localError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Next Game Overview & Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Next Game</CardTitle>
          <CardDescription className="text-base mt-1">
            {formatGameDate(game.game_date)} at {GAME_CONFIG.START_TIME}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Download Lineup Button - shown when teams announced */}
          {game.teams_announced && (
            <div className="pb-4 border-b">
              <Button onClick={handleDownloadLineup} disabled={generatingLineup} className="w-full" size="lg">
                {generatingLineup ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Image...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Lineup
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Player Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 text-indigo-600" />
              <div>
                <div className="text-2xl font-bold">
                  {confirmedPlayers.length} / {GAME_CONFIG.TOTAL_PLAYERS}
                </div>
                <div className="text-sm text-gray-600">Confirmed Players</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {paidPlayers.length} / {confirmedPlayers.length}
                </div>
                <div className="text-sm text-gray-600">Paid Players</div>
              </div>
            </div>
          </div>

          {/* Player Management Table */}
          <div className="pt-6 border-t">
            <h3 className="font-semibold text-lg mb-4">Players in Game</h3>

            {/* Players Table */}
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Player</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Payment</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(() => {
                    // Filter out declined, withdrawn, and waitlist players
                    const activePlayers = players.filter(p =>
                      p.status !== 'priority_declined' &&
                      p.status !== 'withdrawn' &&
                      p.status !== 'waitlist'
                    )

                    // Sort by payment status: verified > marked_paid > pending/unpaid
                    const sortedPlayers = [...activePlayers].sort((a, b) => {
                      const paymentOrder = {
                        'verified': 0,
                        'marked_paid': 1,
                        'pending': 2,
                        'unpaid': 3
                      }
                      const orderA = paymentOrder[a.payment_status] ?? 3
                      const orderB = paymentOrder[b.payment_status] ?? 3
                      return orderA - orderB
                    })

                    if (sortedPlayers.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            No players in this game yet
                          </td>
                        </tr>
                      )
                    }

                    return sortedPlayers.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{player.player.display_name}</div>
                          <div className="text-sm text-gray-500">{player.player.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {player.status === 'priority_invited' && (
                              <Badge variant="outline" className="w-fit">Priority Invited</Badge>
                            )}
                            {player.status === 'priority_confirmed' && (
                              <Badge variant="default" className="w-fit">Priority Confirmed</Badge>
                            )}
                            {player.status === 'lottery_selected' && (
                              <Badge className="w-fit bg-purple-600 hover:bg-purple-700">Manually Added ⭐</Badge>
                            )}
                            {player.status === 'confirmed' && (
                              <Badge variant="default" className="w-fit">Confirmed</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {player.payment_status === 'verified' && (
                            <Badge className="bg-green-600 hover:bg-green-700">Paid ✓</Badge>
                          )}
                          {player.payment_status === 'marked_paid' && (
                            <Badge className="bg-yellow-600 hover:bg-yellow-700">Marked Paid</Badge>
                          )}
                          {player.payment_status === 'pending' && (
                            <Badge variant="outline">Not Yet Paid</Badge>
                          )}
                          {player.payment_status === 'unpaid' && (
                            <Badge variant="destructive">Unpaid</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePlayerClick(player.player_id, player.player.display_name)}
                            disabled={removingPlayer === player.player_id}
                          >
                            {removingPlayer === player.player_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>

            {/* Add Player Form */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Add Player to Game</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedPlayerId}
                  onValueChange={setSelectedPlayerId}
                  disabled={loadingProfiles || addingPlayer}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allProfiles
                      .filter(profile => !players.find(p => p.player_id === profile.id))
                      .map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.display_name} ({profile.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddPlayer}
                  disabled={!selectedPlayerId || addingPlayer}
                >
                  {addingPlayer ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Player'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Non-Payment Removal Section */}
          {(() => {
            const nonPaidPlayers = players.filter(
              p =>
                (p.status === 'priority_confirmed' || p.status === 'lottery_selected' || p.status === 'confirmed') &&
                p.payment_status === 'pending' &&
                game.payment_deadline &&
                new Date(game.payment_deadline) < new Date()
            )

            if (nonPaidPlayers.length === 0) return null

            return (
              <div className="pt-6 border-t">
                <h3 className="font-semibold text-lg mb-4 text-red-600">Non-Payment Actions</h3>
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {nonPaidPlayers.length} player(s) haven't paid by deadline
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 mb-4">
                  {nonPaidPlayers.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div>
                        <div className="font-medium">{p.player.display_name}</div>
                        <div className="text-sm text-gray-600">{p.player.email}</div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveNonPayer(p.id, p.player.display_name)}
                      >
                        Remove & Reopen Spot
                      </Button>
                    </div>
                  ))}
                </div>

                <Alert>
                  <AlertDescription>
                    After removing non-payers, go to <Link href="/admin/messages" className="font-semibold underline">Messages page</Link> to copy the "Spot Reopened" template for WhatsApp.
                  </AlertDescription>
                </Alert>
              </div>
            )
          })()}

          {/* Cancel Game Button */}
          {game.status !== 'completed' && (
            <div className="pt-6 border-t">
              <Button
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                disabled={updating}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Game
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {unpaidPlayers.length > 0 && game.status === 'payment_pending' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {unpaidPlayers.length} player{unpaidPlayers.length !== 1 ? 's have' : ' has'} not paid yet.
            Payment deadline: {timeUntil(game.payment_deadline)}
          </AlertDescription>
        </Alert>
      )}

      {/* Spot Availability Counter - hide when teams announced */}
      {!game.teams_announced && (
        availableSpots > 0 ? (
          <Alert>
            <AlertDescription>
              <strong>{availableSpots}</strong> spot(s) available for FCFS registration ({filledSpots}/{GAME_CONFIG.TOTAL_PLAYERS} filled)
            </AlertDescription>
          </Alert>
        ) : filledSpots < GAME_CONFIG.TOTAL_PLAYERS ? (
          <Alert>
            <AlertDescription>
              Need {GAME_CONFIG.TOTAL_PLAYERS} confirmed and paid players to generate teams. Currently have{' '}
              {confirmedPaidPlayers.length}.
            </AlertDescription>
          </Alert>
        ) : null
      )}

      {/* Team Generation */}
      {confirmedPaidPlayers.length === 16 && !game.teams_announced && teams.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Teams</CardTitle>
            <CardDescription>Create balanced teams based on skill ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerateTeams} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Teams...
                </>
              ) : (
                <>
                  <Shuffle className="h-4 w-4 mr-2" />
                  Generate Balanced Teams
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Display */}
      {teams.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dark Team */}
            <Card className={TEAM_COLORS.DARK.bg}>
              <CardHeader>
                <CardTitle className={TEAM_COLORS.DARK.text}>
                  Dark Team (Skill: {getTeamSkillTotal('dark')})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {darkTeam.map((p) => (
                  <div key={p.id} className="bg-white p-3 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{p.player.display_name}</div>
                        <div className="text-xs text-gray-600">
                          Skill: {p.player.skill_rating || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={p.assignment.position || ''}
                        onValueChange={(value) =>
                          updatePlayerAssignment(p.player_id, 'position', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keeper">Keeper</SelectItem>
                          <SelectItem value="field">Field</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={
                          p.assignment.is_starting === undefined
                            ? ''
                            : p.assignment.is_starting
                            ? 'starting'
                            : 'sub'
                        }
                        onValueChange={(value) =>
                          updatePlayerAssignment(p.player_id, 'is_starting', value === 'starting')
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starting">Starting</SelectItem>
                          <SelectItem value="sub">Sub</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Light Team */}
            <Card className={TEAM_COLORS.LIGHT.bg}>
              <CardHeader>
                <CardTitle className={TEAM_COLORS.LIGHT.text}>
                  Light Team (Skill: {getTeamSkillTotal('light')})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lightTeam.map((p) => (
                  <div key={p.id} className="bg-white p-3 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{p.player.display_name}</div>
                        <div className="text-xs text-gray-600">
                          Skill: {p.player.skill_rating || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={p.assignment.position || ''}
                        onValueChange={(value) =>
                          updatePlayerAssignment(p.player_id, 'position', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keeper">Keeper</SelectItem>
                          <SelectItem value="field">Field</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={
                          p.assignment.is_starting === undefined
                            ? ''
                            : p.assignment.is_starting
                            ? 'starting'
                            : 'sub'
                        }
                        onValueChange={(value) =>
                          updatePlayerAssignment(p.player_id, 'is_starting', value === 'starting')
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starting">Starting</SelectItem>
                          <SelectItem value="sub">Sub</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Confirm Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Button onClick={handleConfirmTeams} disabled={confirming} className="flex-1">
                  {confirming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Teams & Announce
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setTeams([])} disabled={confirming}>
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Hidden Lineup for Export - positioned off-screen so html-to-image can render it */}
      {game.teams_announced && (
        <>
          <div className="fixed left-[-9999px] top-0">
            <div ref={lineupRef} className="bg-gradient-to-br from-green-600 to-green-800 p-8" style={{ width: '800px' }}>
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">DropIn FC</h1>
                <p className="text-xl text-green-100">{formatGameDate(game.game_date)}</p>
                <p className="text-lg text-green-200">
                  {GAME_CONFIG.START_TIME} • {GAME_CONFIG.LOCATION}
                </p>
              </div>

              {/* Teams Container */}
              <div className="grid grid-cols-2 gap-6">
                {/* Dark Team */}
                <div className="bg-gray-900 rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-white mb-4 text-center border-b-2 border-gray-700 pb-2">
                    DARK
                  </h2>

                  {/* Keeper */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">🧤 KEEPER</h3>
                    <p className="text-white text-lg">{darkKeeper?.player.display_name || 'TBD'}</p>
                  </div>

                  {/* Field */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">⚽ FIELD</h3>
                    <div className="space-y-1">
                      {darkField.map((p) => (
                        <p key={p.id} className="text-white">
                          {p.player.display_name}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Subs */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">🔄 SUBS</h3>
                    <div className="space-y-1">
                      {darkSubs.map((p) => (
                        <p key={p.id} className="text-gray-300 text-sm">
                          {p.player.display_name}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Light Team */}
                <div className="bg-white rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center border-b-2 border-gray-200 pb-2">
                    LIGHT
                  </h2>

                  {/* Keeper */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">🧤 KEEPER</h3>
                    <p className="text-gray-900 text-lg">{lightKeeper?.player.display_name || 'TBD'}</p>
                  </div>

                  {/* Field */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">⚽ FIELD</h3>
                    <div className="space-y-1">
                      {lightField.map((p) => (
                        <p key={p.id} className="text-gray-900">
                          {p.player.display_name}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Subs */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">🔄 SUBS</h3>
                    <div className="space-y-1">
                      {lightSubs.map((p) => (
                        <p key={p.id} className="text-gray-600 text-sm">
                          {p.player.display_name}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cancel Game Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel This Game?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the current game and all its data, then create a new game for next Tuesday ({formatGameDate(new Date(new Date(game.game_date).getTime() + 7 * 24 * 60 * 60 * 1000))}) with the same priority players invited.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Game</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelGame}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Game'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Player Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player from Game?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{playerToRemove?.name}</strong> from this game?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingPlayer !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemovePlayer}
              disabled={removingPlayer !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {removingPlayer ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Yes, Remove Player'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
