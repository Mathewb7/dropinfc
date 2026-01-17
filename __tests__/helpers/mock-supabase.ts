import { vi } from 'vitest'

/**
 * Creates a mock Supabase client for unit tests
 * This avoids the need for a real database connection in unit tests
 */
export function createMockSupabaseClient() {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }

  const mockClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),

    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),

    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),

    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  }

  return mockClient
}

/**
 * Helper to setup mock query responses
 */
export function mockQueryResponse(client: any, data: any, error: any = null) {
  client.maybeSingle.mockResolvedValueOnce({ data, error })
  client.single.mockResolvedValueOnce({ data, error })
  return client
}

/**
 * Helper to setup mock list responses
 */
export function mockListResponse(client: any, data: any[], error: any = null) {
  const mockValue = { data, error }
  client.select.mockResolvedValueOnce(mockValue)
  return client
}
