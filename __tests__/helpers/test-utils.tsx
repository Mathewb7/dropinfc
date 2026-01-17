import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Wait utility for async operations
 */
export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sample test data generators
 */
export const mockGame = {
  id: 'test-game-id',
  game_date: '2026-01-20',
  status: 'waitlist_open' as const,
  priority_deadline: '2026-01-16T12:00:00Z',
  payment_reminder_time: '2026-01-18T12:00:00Z',
  payment_deadline: '2026-01-18T23:59:59Z',
  sunday_lottery_deadline: '2026-01-19T12:00:00Z',
  teams_announced: false,
  created_at: '2026-01-15T00:00:00Z',
}

export const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  display_name: 'Test User',
  whatsapp_name: 'TestUser',
  is_permanent_keeper: false,
  skill_rating: 4,
  credit_balance: 0,
  withdrawal_strikes: 0,
  strike_cooldown_until: null,
  total_games_played: 10,
  times_started_as_sub: 2,
  times_started_as_keeper: 0,
  weeks_since_last_played: 1,
  role: 'player' as const,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

export const mockGamePlayer = {
  id: 'test-game-player-id',
  game_id: 'test-game-id',
  player_id: 'test-user-id',
  status: 'waitlist' as const,
  payment_status: 'pending' as const,
  team: null,
  position: null,
  is_starting: null,
  joined_waitlist_at: '2026-01-15T10:00:00Z',
  confirmed_at: null,
  paid_at: null,
  created_at: '2026-01-15T10:00:00Z',
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
