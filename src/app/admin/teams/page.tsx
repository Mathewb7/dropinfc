'use client'

import { useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Shuffle, CheckCircle, AlertTriangle } from 'lucide-react'
import { TEAM_COLORS } from '@/lib/constants'

interface TeamAssignment {
  player_id: string
  team: 'dark' | 'light'
  position?: 'keeper' | 'field'
  is_starting?: boolean
}

function getStartingValue(isStarting: boolean | undefined): string {
  if (isStarting === undefined) return ''
  return isStarting ? 'starting' : 'sub'
}

export default function TeamsPage() {
  const { game, players, loading, refetch } = useGame()
  const [teams, setTeams] = useState<TeamAssignment[]>([])
  const [generating, setGenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Balancing</h1>
          <p className="text-gray-600 mt-2">No game scheduled</p>
        </div>
      </div>
    )
  }

  const confirmedPaidPlayers = players.filter(
    (p) =>
      (p.status === 'priority_confirmed' ||
        p.status === 'lottery_selected' ||
        p.status === 'confirmed') &&
      (p.payment_status === 'verified' || p.payment_status === 'marked_paid')
  )

  const handleGenerateTeams = async () => {
    setGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error: balanceError } = await supabase.rpc('balance_teams', {
        p_game_id: game.id,
      })

      if (balanceError) throw balanceError

      setTeams(data || [])
      setSuccess('Teams generated! Assign positions and confirm.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate teams')
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
    setConfirming(true)
    setError(null)

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
      setError(err instanceof Error ? err.message : 'Failed to confirm teams')
    } finally {
      setConfirming(false)
    }
  }

  const getTeamPlayers = (team: 'dark' | 'light') => {
    return teams
      .filter((t) => t.team === team)
      .map((t) => {
        const player = confirmedPaidPlayers.find((p) => p.player_id === t.player_id)
        return player ? { ...player, assignment: t } : null
      })
      .filter((p) => p !== null)
  }

  const darkTeam = getTeamPlayers('dark')
  const lightTeam = getTeamPlayers('light')

  const getTeamSkillTotal = (team: 'dark' | 'light') => {
    return getTeamPlayers(team).reduce((sum, p) => sum + (p.player.skill_rating || 0), 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Balancing</h1>
        <p className="text-gray-600 mt-2">Generate balanced teams by skill rating</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Game Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Confirmed & Paid Players</span>
              <span className="font-semibold">{confirmedPaidPlayers.length} / 16</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teams Announced</span>
              <Badge variant={game.teams_announced ? 'default' : 'outline'}>
                {game.teams_announced ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Teams Button */}
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
                        value={getStartingValue(p.assignment.is_starting)}
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
                        value={getStartingValue(p.assignment.is_starting)}
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

      {/* Already Announced */}
      {game.teams_announced && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Teams have already been announced for this game.</AlertDescription>
        </Alert>
      )}

      {/* Not Enough Players */}
      {confirmedPaidPlayers.length < 16 && (
        <Alert>
          <AlertDescription>
            Need 16 confirmed and paid players to generate teams. Currently have{' '}
            {confirmedPaidPlayers.length}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
