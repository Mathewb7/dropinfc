'use client'

import { useRef, useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { toPng } from 'html-to-image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, Image as ImageIcon } from 'lucide-react'
import { formatGameDate } from '@/lib/utils'
import { GAME_CONFIG, TEAM_COLORS } from '@/lib/constants'

interface TeamPlayer {
  team?: string | null
  position?: string | null
  is_starting?: boolean | null
}

function filterByTeam<T extends TeamPlayer>(players: T[], team: 'dark' | 'light'): T[] {
  return players.filter(p => p.team === team)
}

function getTeamLineup<T extends TeamPlayer>(teamPlayers: T[]) {
  return {
    keeper: teamPlayers.find(p => p.position === 'keeper' && p.is_starting),
    field: teamPlayers.filter(p => p.position === 'field' && p.is_starting),
    subs: teamPlayers.filter(p => !p.is_starting)
  }
}

export default function LineupPage() {
  const { game, players, loading } = useGame()
  const [generating, setGenerating] = useState(false)
  const lineupRef = useRef<HTMLDivElement>(null)

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
          <h1 className="text-3xl font-bold">Lineup Image</h1>
          <p className="text-gray-600 mt-2">No game scheduled</p>
        </div>
      </div>
    )
  }

  if (!game.teams_announced) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Lineup Image</h1>
          <p className="text-gray-600 mt-2">Teams have not been announced yet</p>
        </div>
        <Alert>
          <AlertDescription>Generate teams first before creating lineup image.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const darkTeam = filterByTeam(players, 'dark')
  const lightTeam = filterByTeam(players, 'light')

  const { keeper: darkKeeper, field: darkField, subs: darkSubs } = getTeamLineup(darkTeam)
  const { keeper: lightKeeper, field: lightField, subs: lightSubs } = getTeamLineup(lightTeam)

  const handleDownload = async () => {
    if (!lineupRef.current) return

    setGenerating(true)
    try {
      const dataUrl = await toPng(lineupRef.current, {
        quality: 1.0,
        pixelRatio: 2,
      })

      const link = document.createElement('a')
      link.download = `dropin-fc-lineup-${formatGameDate(game.game_date)}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to generate image:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lineup Image</h1>
        <p className="text-gray-600 mt-2">Download lineup as image for WhatsApp</p>
      </div>

      {/* Download Button */}
      <Card>
        <CardHeader>
          <CardTitle>Download Lineup</CardTitle>
          <CardDescription>Generate and download lineup image as PNG</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownload} disabled={generating} className="w-full">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Image...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Lineup Image
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Lineup Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>This is how the lineup image will look</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Lineup Image Container */}
          <div ref={lineupRef} className="bg-gradient-to-br from-green-600 to-green-800 p-8">
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

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-green-100 text-sm">See you on the pitch! ⚽</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
