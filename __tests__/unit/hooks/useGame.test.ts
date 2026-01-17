import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGame } from '@/hooks/useGame'
import { createMockSupabaseClient, mockQueryResponse } from '../../helpers/mock-supabase'
import { mockGame, mockGamePlayer, mockProfile } from '../../helpers/test-utils'

// Mock the Supabase client module
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

let mockSupabase: any

describe('useGame Hook', () => {
  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
  })

  it('should fetch game and players on mount', async () => {
    // Setup mock responses
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        gte: vi.fn().mockReturnValueOnce({
          order: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockReturnValueOnce({
              maybeSingle: vi.fn().mockResolvedValueOnce({
                data: mockGame,
                error: null,
              }),
            }),
          }),
        }),
      }),
    })

    const mockGamePlayerWithProfile = {
      ...mockGamePlayer,
      player: mockProfile,
    }

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockResolvedValueOnce({
          data: [mockGamePlayerWithProfile],
          error: null,
        }),
      }),
    })

    const { result } = renderHook(() => useGame())

    // Initially loading
    expect(result.current.loading).toBe(true)

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Check that game and players are loaded
    expect(result.current.game).toEqual(mockGame)
    expect(result.current.players).toEqual([mockGamePlayerWithProfile])
    expect(result.current.error).toBe(null)
  })

  it('should handle no game gracefully', async () => {
    // Setup mock to return no game
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        gte: vi.fn().mockReturnValueOnce({
          order: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockReturnValueOnce({
              maybeSingle: vi.fn().mockResolvedValueOnce({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      }),
    })

    const { result } = renderHook(() => useGame())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.game).toBe(null)
    expect(result.current.players).toEqual([])
    expect(result.current.error).toBe(null)
  })

  it('should setup real-time subscription on mount', () => {
    const { result } = renderHook(() => useGame())

    // Verify channel was created and subscribed
    expect(mockSupabase.channel).toHaveBeenCalledWith('game-changes')
    expect(mockSupabase.channel().on).toHaveBeenCalledTimes(2) // games and game_players
    expect(mockSupabase.channel().subscribe).toHaveBeenCalled()
  })

  it('should cleanup subscription on unmount', () => {
    const { unmount } = renderHook(() => useGame())

    unmount()

    // Verify channel was removed
    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })

  it('should provide refetch function', async () => {
    // Setup initial mock response - need to mock both games and game_players
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'games') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: mockGame,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'game_players') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }
      }
      return {}
    })

    const { result } = renderHook(() => useGame())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Refetch should be a function
    expect(typeof result.current.refetch).toBe('function')

    // Call refetch
    await result.current.refetch()

    // Should have made another request
    expect(mockSupabase.from).toHaveBeenCalledWith('games')
  })
})
