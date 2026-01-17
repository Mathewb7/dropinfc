import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Integration Tests for Supabase Real-time API
 *
 * These tests validate that the Supabase real-time client API is accessible:
 * 1. Client can create channels
 * 2. Channels can be subscribed to
 * 3. Channels can be unsubscribed
 * 4. Multiple clients can create separate channels
 *
 * Note: Full end-to-end real-time message delivery and WebSocket behavior
 * is tested in E2E tests where browser context can be properly simulated.
 *
 * Integration tests cannot reliably test postgres_changes subscriptions
 * because they require proper realtime server configuration and WebSocket
 * connections which are better suited for E2E testing.
 *
 * Prerequisites:
 * - Local Supabase running (npx supabase start)
 * - .env.test configured with TEST_SUPABASE_URL and keys
 */

describe('Real-time API Integration Tests', () => {
  let client1: any
  let client2: any

  beforeAll(async () => {
    const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
    const anonKey = process.env.TEST_SUPABASE_ANON_KEY || ''

    // Create two separate clients for testing
    client1 = createClient<Database>(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    client2 = createClient<Database>(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  })

  afterAll(async () => {
    // No cleanup needed - channels are removed on unsubscribe
  })

  it('should be able to create a realtime channel', () => {
    const channel = client1.channel('test-channel')

    expect(channel).toBeDefined()
    expect(channel.topic).toContain('test-channel')
  })

  it('should be able to subscribe and unsubscribe from a channel', async () => {
    const channel = client1.channel('subscribe-test')

    // Subscribe
    channel.subscribe()

    // Verify channel exists
    expect(channel).toBeDefined()

    // Unsubscribe
    const result = await channel.unsubscribe()

    // Verify unsubscribe returns ok
    expect(result).toBe('ok')
  })

  it('should allow multiple clients to create separate channels', () => {
    const channel1 = client1.channel('client-1-channel')
    const channel2 = client2.channel('client-2-channel')

    expect(channel1).toBeDefined()
    expect(channel2).toBeDefined()
    expect(channel1.topic).not.toBe(channel2.topic)
  })

  it('should support registering postgres_changes listeners', () => {
    const channel = client1
      .channel('postgres-test')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
        },
        () => {
          // Callback registered
        }
      )

    expect(channel).toBeDefined()

    // Note: We don't test if callbacks fire - that's for E2E tests
  })

  it('should support multiple event listeners on same channel', () => {
    const channel = client1
      .channel('multi-listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'games',
        },
        () => {}
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
        },
        () => {}
      )

    expect(channel).toBeDefined()
  })

  it('should support presence channel creation', () => {
    const channel = client1.channel('presence-test')

    expect(channel).toBeDefined()
    expect(typeof channel.track).toBe('function')
    expect(typeof channel.untrack).toBe('function')
  })

  it('should support broadcast channel creation', () => {
    const channel = client1.channel('broadcast-test')
      .on('broadcast', { event: 'test' }, () => {})

    expect(channel).toBeDefined()
    expect(typeof channel.send).toBe('function')
  })

  it('should handle cleanup of multiple channels', async () => {
    const channel1 = client1.channel('cleanup-1').subscribe()
    const channel2 = client1.channel('cleanup-2').subscribe()
    const channel3 = client1.channel('cleanup-3').subscribe()

    // Wait a bit for subscriptions
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Unsubscribe all
    const result1 = await channel1.unsubscribe()
    const result2 = await channel2.unsubscribe()
    const result3 = await channel3.unsubscribe()

    expect(result1).toBe('ok')
    expect(result2).toBe('ok')
    expect(result3).toBe('ok')
  })

  it('should support filtering postgres_changes by row', () => {
    const testId = 'test-id-123'

    const channel = client1
      .channel('filtered-test')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${testId}`,
        },
        () => {}
      )

    expect(channel).toBeDefined()
  })
})
