'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Game, GamePlayer, Profile } from '@/types/database'

type GamePlayerWithProfile = GamePlayer & {
  player: Profile
}

interface UseGameReturn {
  game: Game | null
  players: GamePlayerWithProfile[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Hook to fetch the current upcoming game and its players
 * Automatically subscribes to real-time updates
 */
export function useGame(): UseGameReturn {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<GamePlayerWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function fetchGame(): Promise<void> {
    setLoading(true)
    setError(null)

    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .gte('game_date', getTodayDateString())
      .order('game_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (gameError || !gameData) {
      setGame(null)
      setPlayers([])
      setLoading(false)
      return
    }

    setGame(gameData)

    const { data: playersData } = await supabase
      .from('game_players')
      .select(`*, player:profiles(*)`)
      .eq('game_id', gameData.id)

    setPlayers((playersData as GamePlayerWithProfile[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchGame()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('game-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        () => fetchGame()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players' },
        () => fetchGame()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    game,
    players,
    loading,
    error,
    refetch: fetchGame,
  }
}
