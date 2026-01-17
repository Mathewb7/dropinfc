import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestSupabaseClient, createAuthenticatedTestClient } from '../../helpers/supabase-test-client'
import { Database } from '@/types/database'

/**
 * Integration Tests for Critical RPC Functions
 *
 * These tests validate the team balancing algorithm:
 * - balance_teams() - Skill-balanced team assignments
 *
 * Prerequisites:
 * - Local Supabase running (npx supabase start)
 * - Test database seeded with 45 players (npm run test:db:seed)
 * - .env.test configured with TEST_SUPABASE_URL and keys
 */

describe('RPC Functions Integration Tests', () => {
  let supabase: ReturnType<typeof createTestSupabaseClient>
  let adminClient: any
  let testGameId: string

  beforeAll(async () => {
    // Create admin client using service key (bypasses RLS for testing)
    const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
    const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY || ''

    if (!serviceKey) {
      throw new Error('TEST_SUPABASE_SERVICE_KEY is required for integration tests')
    }

    // Import createClient here to avoid module issues
    const { createClient } = await import('@supabase/supabase-js')
    adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Create regular supabase client
    supabase = createTestSupabaseClient()
  })

  beforeEach(async () => {
    // Create a fresh test game for each test
    // Use a unique date for each test to avoid unique constraint violations
    const daysOffset = Math.floor(Math.random() * 365) + 7 // Random day between 7-372 days from now
    const gameDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: game, error } = await adminClient
      .from('games')
      .insert({
        game_date: gameDate,
        status: 'waitlist_open',
        priority_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        payment_reminder_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        payment_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        sunday_lottery_deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        teams_announced: false,
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create test game: ${error.message}`)
    testGameId = game.id
  })

  afterEach(async () => {
    // Cleanup: remove test game and related data after each test
    if (testGameId) {
      await adminClient.from('games').delete().eq('id', testGameId)
      testGameId = ''
    }
  })

  afterAll(async () => {
    // Final cleanup
  })

  // ========================================
  // BALANCE TEAMS TESTS
  // ========================================

  describe('balance_teams()', () => {
    it('should create two teams of 8 players each', async () => {
      // Get 16 confirmed players (any players, not filtering by email)
      const { data: players } = await adminClient
        .from('profiles')
        .select('id')
        .neq('role', 'super_admin') // Exclude super_admin to have clean test data
        .limit(16)

      if (!players || players.length < 16) {
        throw new Error(`Insufficient test players: found ${players?.length || 0}, need 16`)
      }

      // Add all as confirmed
      for (const player of players) {
        await adminClient.from('game_players').insert({
          game_id: testGameId,
          player_id: player.id,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
      }

      // Run team balancing
      const { data: assignments, error } = await adminClient.rpc('balance_teams', {
        p_game_id: testGameId,
      })

      expect(error).toBeNull()
      expect(assignments).toBeDefined()
      expect(assignments?.length).toBe(16)

      // Count players per team
      const results = assignments as Array<{
        player_id: string
        assigned_team: 'dark' | 'light'
        assigned_position: 'field' | 'sub' | 'keeper'
        is_starting: boolean
      }>

      const darkTeam = results.filter((a) => a.assigned_team === 'dark')
      const lightTeam = results.filter((a) => a.assigned_team === 'light')

      expect(darkTeam.length).toBe(8)
      expect(lightTeam.length).toBe(8)
    })

    it('should select and assign 2 keepers to different teams', async () => {
      // Get 2 permanent keepers + 14 players
      const { data: keepers } = await adminClient
        .from('profiles')
        .select('id, is_permanent_keeper')
        .eq('is_permanent_keeper', true)
        .limit(2)

      const { data: players } = await adminClient
        .from('profiles')
        .select('id')
        .eq('is_permanent_keeper', false)
        .like('email', 'player%@dropin.test')
        .limit(14)

      if (!keepers || !players || keepers.length < 2 || players.length < 14) {
        throw new Error('Insufficient test data')
      }

      // Add all as confirmed
      const allPlayers = [...keepers, ...players]
      for (const player of allPlayers) {
        await adminClient.from('game_players').insert({
          game_id: testGameId,
          player_id: player.id,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
      }

      // Run team balancing
      const { data: assignments } = await adminClient.rpc('balance_teams', {
        p_game_id: testGameId,
      })

      expect(assignments).toBeDefined()

      const results = assignments as Array<{
        player_id: string
        assigned_team: 'dark' | 'light'
        assigned_position: 'field' | 'sub' | 'keeper'
        is_starting: boolean
      }>

      // Find keeper assignments
      const assignedKeepers = results.filter((a) => a.assigned_position === 'keeper')

      expect(assignedKeepers.length).toBe(2)
      expect(assignedKeepers[0].assigned_team).not.toBe(assignedKeepers[1].assigned_team)
      expect(assignedKeepers[0].is_starting).toBe(true)
      expect(assignedKeepers[1].is_starting).toBe(true)
    })

    it('should balance team skill ratings within reasonable margin', async () => {
      // Get 16 players with varying skill ratings
      const { data: players } = await adminClient
        .from('profiles')
        .select('id, skill_rating')
        .neq('role', 'super_admin')
        .not('skill_rating', 'is', null)
        .limit(16)

      if (!players || players.length < 16) {
        throw new Error(`Insufficient test players: found ${players?.length || 0}, need 16`)
      }

      // Add all as confirmed
      for (const player of players) {
        await adminClient.from('game_players').insert({
          game_id: testGameId,
          player_id: player.id,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
      }

      // Run team balancing
      const { data: assignments } = await adminClient.rpc('balance_teams', {
        p_game_id: testGameId,
      })

      expect(assignments).toBeDefined()

      const results = assignments as Array<{
        player_id: string
        assigned_team: 'dark' | 'light'
        assigned_position: 'field' | 'sub' | 'keeper'
        is_starting: boolean
      }>

      // Calculate team skill totals
      const darkPlayers = results.filter((a) => a.assigned_team === 'dark').map((a) => a.player_id)
      const lightPlayers = results.filter((a) => a.assigned_team === 'light').map((a) => a.player_id)

      const darkSkill = players
        .filter((p) => darkPlayers.includes(p.id))
        .reduce((sum, p) => sum + (p.skill_rating || 3), 0)

      const lightSkill = players
        .filter((p) => lightPlayers.includes(p.id))
        .reduce((sum, p) => sum + (p.skill_rating || 3), 0)

      // Teams should be within 5 skill points of each other
      const skillDifference = Math.abs(darkSkill - lightSkill)
      expect(skillDifference).toBeLessThanOrEqual(5)
    })

    it('should designate first 5 per team as starters (6 with keeper)', async () => {
      // Get 16 players
      const { data: players } = await adminClient
        .from('profiles')
        .select('id')
        .neq('role', 'super_admin')
        .limit(16)

      if (!players || players.length < 16) {
        throw new Error(`Insufficient test players: found ${players?.length || 0}, need 16`)
      }

      // Add all as confirmed
      for (const player of players) {
        await adminClient.from('game_players').insert({
          game_id: testGameId,
          player_id: player.id,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
      }

      // Run team balancing
      const { data: assignments } = await adminClient.rpc('balance_teams', {
        p_game_id: testGameId,
      })

      expect(assignments).toBeDefined()

      const results = assignments as Array<{
        player_id: string
        assigned_team: 'dark' | 'light'
        assigned_position: 'field' | 'sub' | 'keeper'
        is_starting: boolean
      }>

      // Check starters per team (1 keeper + 5 field = 6 total)
      const darkStarters = results.filter(
        (a) => a.assigned_team === 'dark' && a.is_starting === true
      )
      const lightStarters = results.filter(
        (a) => a.assigned_team === 'light' && a.is_starting === true
      )

      expect(darkStarters.length).toBe(6)
      expect(lightStarters.length).toBe(6)
    })

    it('should designate 2 subs per team', async () => {
      // Get 16 players
      const { data: players } = await adminClient
        .from('profiles')
        .select('id')
        .neq('role', 'super_admin')
        .limit(16)

      if (!players || players.length < 16) {
        throw new Error(`Insufficient test players: found ${players?.length || 0}, need 16`)
      }

      // Add all as confirmed
      for (const player of players) {
        await adminClient.from('game_players').insert({
          game_id: testGameId,
          player_id: player.id,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
      }

      // Run team balancing
      const { data: assignments } = await adminClient.rpc('balance_teams', {
        p_game_id: testGameId,
      })

      expect(assignments).toBeDefined()

      const results = assignments as Array<{
        player_id: string
        assigned_team: 'dark' | 'light'
        assigned_position: 'field' | 'sub' | 'keeper'
        is_starting: boolean
      }>

      // Check subs per team
      const darkSubs = results.filter(
        (a) => a.assigned_team === 'dark' && a.assigned_position === 'sub'
      )
      const lightSubs = results.filter(
        (a) => a.assigned_team === 'light' && a.assigned_position === 'sub'
      )

      expect(darkSubs.length).toBe(2)
      expect(lightSubs.length).toBe(2)

      // Subs should not be marked as starting
      darkSubs.forEach((sub) => expect(sub.is_starting).toBe(false))
      lightSubs.forEach((sub) => expect(sub.is_starting).toBe(false))
    })

    it('should handle edge case with only 1 permanent keeper', async () => {
      // Get 1 permanent keeper + 15 regular players
      const { data: keepers } = await adminClient
        .from('profiles')
        .select('id')
        .eq('is_permanent_keeper', true)
        .limit(1)

      const { data: players } = await adminClient
        .from('profiles')
        .select('id')
        .eq('is_permanent_keeper', false)
        .like('email', 'player%@dropin.test')
        .limit(15)

      if (!keepers || !players || keepers.length < 1 || players.length < 15) {
        throw new Error('Insufficient test data')
      }

      // Add all as confirmed
      const allPlayers = [...keepers, ...players]
      for (const player of allPlayers) {
        await adminClient.from('game_players').insert({
          game_id: testGameId,
          player_id: player.id,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
      }

      // Run team balancing
      const { data: assignments, error } = await adminClient.rpc('balance_teams', {
        p_game_id: testGameId,
      })

      expect(error).toBeNull()
      expect(assignments).toBeDefined()

      const results = assignments as Array<{
        player_id: string
        assigned_team: 'dark' | 'light'
        assigned_position: 'field' | 'sub' | 'keeper'
        is_starting: boolean
      }>

      // Should still have 2 keepers (1 permanent + 1 random)
      const assignedKeepers = results.filter((a) => a.assigned_position === 'keeper')
      expect(assignedKeepers.length).toBe(2)
    })

    it('should handle edge case with no permanent keepers', async () => {
      // Get 16 regular players (no keepers)
      const { data: players } = await adminClient
        .from('profiles')
        .select('id')
        .eq('is_permanent_keeper', false)
        .like('email', 'player%@dropin.test')
        .limit(16)

      if (!players || players.length < 16) throw new Error('Insufficient test players')

      // Add all as confirmed
      for (const player of players) {
        await adminClient.from('game_players').insert({
          game_id: testGameId,
          player_id: player.id,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
      }

      // Run team balancing
      const { data: assignments, error } = await adminClient.rpc('balance_teams', {
        p_game_id: testGameId,
      })

      expect(error).toBeNull()
      expect(assignments).toBeDefined()

      const results = assignments as Array<{
        player_id: string
        assigned_team: 'dark' | 'light'
        assigned_position: 'field' | 'sub' | 'keeper'
        is_starting: boolean
      }>

      // Should still assign 2 keepers randomly
      const assignedKeepers = results.filter((a) => a.assigned_position === 'keeper')
      expect(assignedKeepers.length).toBe(2)
      expect(assignedKeepers[0].assigned_team).not.toBe(assignedKeepers[1].assigned_team)
    })
  })
})
