'use client'

import { useState, useEffect } from 'react'
import { Game } from '@/types/database'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PlayerActions } from './PlayerActions'
import { GAME_CONFIG } from '@/lib/constants'
import { formatGameDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface NotRegisteredViewProps {
  game: Game
  userId: string
  onAction: () => void
}

/**
 * Simplified view for players not registered for the game
 * Shows available spots count and Join Game button (FCFS)
 */
export function NotRegisteredView({ game, userId, onAction }: NotRegisteredViewProps) {
  const formattedDate = formatGameDate(game.game_date)
  const [availableSpots, setAvailableSpots] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Fetch available spots from view
  useEffect(() => {
    const fetchSpots = async () => {
      const { data } = await supabase
        .from('game_spots_available')
        .select('available_spots')
        .eq('game_id', game.id)
        .single()

      if (data) {
        setAvailableSpots(data.available_spots)
      }
      setLoading(false)
    }

    fetchSpots()
  }, [game.id, supabase])

  return (
    <Card className="text-center">
      <CardHeader>
        <h2 className="text-2xl font-bold">Next Game</h2>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-3xl font-semibold mb-2">{formattedDate}</p>
          <p className="text-xl text-muted-foreground">
            {GAME_CONFIG.START_TIME} - {GAME_CONFIG.END_TIME}
          </p>
        </div>

        {!loading && availableSpots > 0 ? (
          <>
            <div className="flex justify-center">
              <Badge variant="default" className="text-lg px-4 py-2 bg-green-600 hover:bg-green-700">
                {availableSpots} Spot{availableSpots > 1 ? 's' : ''} Available
              </Badge>
            </div>

            <PlayerActions
              game={game}
              myStatus={null}
              userId={userId}
              onAction={onAction}
            />

            <div className="text-sm text-muted-foreground">
              <p>First come, first served! Payment due by Saturday 11:59pm.</p>
            </div>
          </>
        ) : !loading && availableSpots === 0 ? (
          <Alert>
            <AlertDescription>
              Game is full (16/16 players). Check back later in case spots reopen!
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}
