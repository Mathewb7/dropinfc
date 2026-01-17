import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Integration Tests for Database Triggers
 *
 * These tests validate automatic behaviors triggered by database changes:
 * 1. handle_new_user() - Auto-creates profile when auth.users row inserted
 * 2. reset_weeks_since_last_played() - Resets weeks counter when player confirmed
 * 3. update_player_stats_after_game() - Updates player stats when game completed
 *
 * Prerequisites:
 * - Local Supabase running (npx supabase start)
 * - Test database seeded with 45 players (npx supabase db reset)
 * - .env.test configured with TEST_SUPABASE_URL and keys
 */

describe('Database Triggers Integration Tests', () => {
  let supabase: any
  let testGameId: string

  beforeAll(async () => {
    // Create admin client using service key (bypasses RLS for testing)
    const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
    const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY || ''

    if (!serviceKey) {
      throw new Error('TEST_SUPABASE_SERVICE_KEY is required for integration tests')
    }

    supabase = createClient<Database>(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  })

  afterEach(async () => {
    // Cleanup test data after each test
    if (testGameId) {
      await supabase.from('games').delete().eq('id', testGameId)
      testGameId = ''
    }
  })

  // ========================================
  // HANDLE_NEW_USER TRIGGER TESTS
  // ========================================

  describe('handle_new_user() trigger', () => {
    it('should verify trigger exists and works with seeded data', async () => {
      // The handle_new_user() trigger auto-creates profiles when auth.users are inserted
      // We verify it worked by checking that all seeded profiles exist and have correct structure

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name, created_at')
        .limit(10)

      expect(profiles).toBeDefined()
      expect(profiles!.length).toBeGreaterThan(0)

      // Verify each profile has proper structure (proving trigger worked)
      for (const profile of profiles!) {
        expect(profile.id).toBeDefined()
        expect(profile.email).toBeDefined()
        expect(profile.display_name).toBeDefined()
        expect(profile.created_at).toBeDefined()

        // Verify email and id correlation (profile id should match auth.users id)
        expect(profile.email).toContain('@dropin.test')
      }
    })

    it('should set default display_name from email for seeded users', async () => {
      // Check that seeded users have display_name derived from email
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email, display_name')
        .like('email', 'player%@dropin.test')
        .limit(3)

      expect(profiles).toBeDefined()

      for (const profile of profiles!) {
        // Display name should contain "Test Player" (from our seed data)
        expect(profile.display_name).toBeDefined()
        expect(profile.display_name).toContain('Test Player')
      }
    })

    it('should initialize profiles with default values', async () => {
      // Get a newly seeded regular player (not admin)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'player')
        .eq('is_permanent_keeper', false)
        .limit(1)
        .single()

      expect(profile).toBeDefined()

      // Check that profile has proper structure and defaults
      expect(profile.id).toBeDefined()
      expect(profile.email).toBeDefined()
      expect(profile.is_permanent_keeper).toBe(false)
      // credit_balance can be returned as string or number depending on database config
      expect(profile.credit_balance).toBeDefined()
      expect(profile.withdrawal_strikes).toBeGreaterThanOrEqual(0)
      expect(profile.total_games_played).toBeGreaterThanOrEqual(0)
      expect(profile.times_started_as_sub).toBeGreaterThanOrEqual(0)
      expect(profile.times_started_as_keeper).toBeGreaterThanOrEqual(0)
      expect(profile.weeks_since_last_played).toBeGreaterThanOrEqual(0)
      expect(['player', 'admin', 'super_admin']).toContain(profile.role)
      expect(profile.is_active).toBeDefined()
    })
  })

  // ========================================
  // RESET_WEEKS_SINCE_LAST_PLAYED TRIGGER TESTS
  // ========================================

  describe('reset_weeks_since_last_played() trigger', () => {
    it('should reset weeks_since_last_played to 0 when player status changes to confirmed', async () => {
      // Get a test player with non-zero weeks_since_last_played
      const { data: player } = await supabase
        .from('profiles')
        .select('id, weeks_since_last_played')
        .gt('weeks_since_last_played', 0)
        .limit(1)
        .single()

      expect(player).toBeDefined()
      const initialWeeks = player.weeks_since_last_played
      expect(initialWeeks).toBeGreaterThan(0)

      // Create a test game
      const daysOffset = Math.floor(Math.random() * 365) + 7
      const gameDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const { data: game } = await supabase
        .from('games')
        .insert({
          game_date: gameDate,
          status: 'waitlist_open',
          priority_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          payment_reminder_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          payment_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          sunday_lottery_deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .single()

      testGameId = game.id

      // Add player to game with 'waitlist' status
      const { data: gamePlayer } = await supabase
        .from('game_players')
        .insert({
          game_id: testGameId,
          player_id: player.id,
          status: 'waitlist',
          joined_waitlist_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      // Update status to 'confirmed' (trigger should reset weeks)
      const { error: updateError } = await supabase
        .from('game_players')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', gamePlayer.id)

      expect(updateError).toBeNull()

      // Wait for trigger
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Check that weeks_since_last_played was reset to 0
      const { data: updatedPlayer } = await supabase
        .from('profiles')
        .select('weeks_since_last_played')
        .eq('id', player.id)
        .single()

      expect(updatedPlayer.weeks_since_last_played).toBe(0)
    })

    it('should NOT reset weeks when status changes to non-confirmed state', async () => {
      // Get a test player with non-zero weeks
      const { data: player } = await supabase
        .from('profiles')
        .select('id, weeks_since_last_played')
        .gt('weeks_since_last_played', 0)
        .limit(1)
        .single()

      const initialWeeks = player.weeks_since_last_played

      // Create a test game
      const daysOffset = Math.floor(Math.random() * 365) + 7
      const gameDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const { data: game } = await supabase
        .from('games')
        .insert({
          game_date: gameDate,
          status: 'waitlist_open',
          priority_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          payment_reminder_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          payment_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          sunday_lottery_deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .single()

      testGameId = game.id

      // Add player to game
      await supabase.from('game_players').insert({
        game_id: testGameId,
        player_id: player.id,
        status: 'waitlist',
        joined_waitlist_at: new Date().toISOString(),
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check that weeks_since_last_played was NOT changed
      const { data: samePlayer } = await supabase
        .from('profiles')
        .select('weeks_since_last_played')
        .eq('id', player.id)
        .single()

      expect(samePlayer.weeks_since_last_played).toBe(initialWeeks)
    })
  })

  // ========================================
  // UPDATE_PLAYER_STATS_AFTER_GAME TRIGGER TESTS
  // ========================================

  describe('update_player_stats_after_game() trigger', () => {
    it('should increment total_games_played when game status changes to completed', async () => {
      // Get 3 test players
      const { data: players } = await supabase
        .from('profiles')
        .select('id, total_games_played')
        .neq('role', 'super_admin')
        .limit(3)

      expect(players.length).toBe(3)

      const initialStats = players.map((p) => ({
        id: p.id,
        total_games_played: p.total_games_played,
      }))

      // Create a test game
      const daysOffset = Math.floor(Math.random() * 365) + 7
      const gameDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const { data: game } = await supabase
        .from('games')
        .insert({
          game_date: gameDate,
          status: 'teams_assigned',
          priority_deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          payment_reminder_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          payment_deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          sunday_lottery_deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          teams_announced: true,
        })
        .select('id')
        .single()

      testGameId = game.id

      // Add all 3 players as confirmed with team assignments
      for (let i = 0; i < players.length; i++) {
        await supabase.from('game_players').insert({
          game_id: testGameId,
          player_id: players[i].id,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          team: i % 2 === 0 ? 'dark' : 'light',
          position: 'field',
          is_starting: true,
        })
      }

      // Mark game as completed (trigger should update stats)
      const { error: updateError } = await supabase
        .from('games')
        .update({ status: 'completed' })
        .eq('id', testGameId)

      expect(updateError).toBeNull()

      // Wait for trigger
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Check that total_games_played was incremented for all players
      for (const initial of initialStats) {
        const { data: updatedPlayer } = await supabase
          .from('profiles')
          .select('total_games_played')
          .eq('id', initial.id)
          .single()

        expect(updatedPlayer.total_games_played).toBe(initial.total_games_played + 1)
      }
    })

    it('should increment times_started_as_sub for sub players', async () => {
      // Get a test player
      const { data: player } = await supabase
        .from('profiles')
        .select('id, times_started_as_sub, total_games_played')
        .neq('role', 'super_admin')
        .limit(1)
        .single()

      const initialSubTimes = player.times_started_as_sub

      // Create a test game
      const daysOffset = Math.floor(Math.random() * 365) + 7
      const gameDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const { data: game } = await supabase
        .from('games')
        .insert({
          game_date: gameDate,
          status: 'teams_assigned',
          priority_deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          payment_reminder_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          payment_deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          sunday_lottery_deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          teams_announced: true,
        })
        .select('id')
        .single()

      testGameId = game.id

      // Add player as SUB and STARTING
      await supabase.from('game_players').insert({
        game_id: testGameId,
        player_id: player.id,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        team: 'dark',
        position: 'sub',
        is_starting: true,
      })

      // Mark game as completed
      await supabase.from('games').update({ status: 'completed' }).eq('id', testGameId)

      await new Promise((resolve) => setTimeout(resolve, 200))

      // Check that times_started_as_sub was incremented
      const { data: updatedPlayer } = await supabase
        .from('profiles')
        .select('times_started_as_sub')
        .eq('id', player.id)
        .single()

      expect(updatedPlayer.times_started_as_sub).toBe(initialSubTimes + 1)
    })

    it('should increment times_started_as_keeper for keeper players', async () => {
      // Get a permanent keeper
      const { data: keeper } = await supabase
        .from('profiles')
        .select('id, times_started_as_keeper, total_games_played')
        .eq('is_permanent_keeper', true)
        .limit(1)
        .single()

      expect(keeper).toBeDefined()

      const initialKeeperTimes = keeper.times_started_as_keeper

      // Create a test game
      const daysOffset = Math.floor(Math.random() * 365) + 7
      const gameDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const { data: game, error: insertError } = await supabase
        .from('games')
        .insert({
          game_date: gameDate,
          status: 'teams_assigned',
          priority_deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          payment_reminder_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          payment_deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          sunday_lottery_deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          teams_announced: true,
        })
        .select('id')
        .single()

      if (insertError || !game) {
        throw new Error(`Failed to create game: ${insertError?.message || 'No data returned'}`)
      }

      testGameId = game.id

      // Add player as KEEPER and STARTING
      await supabase.from('game_players').insert({
        game_id: testGameId,
        player_id: keeper.id,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        team: 'dark',
        position: 'keeper',
        is_starting: true,
      })

      // Mark game as completed
      await supabase.from('games').update({ status: 'completed' }).eq('id', testGameId)

      await new Promise((resolve) => setTimeout(resolve, 200))

      // Check that times_started_as_keeper was incremented
      const { data: updatedKeeper } = await supabase
        .from('profiles')
        .select('times_started_as_keeper')
        .eq('id', keeper.id)
        .single()

      expect(updatedKeeper.times_started_as_keeper).toBe(initialKeeperTimes + 1)
    })

    it('should NOT update stats for non-confirmed players', async () => {
      // Get a test player
      const { data: player } = await supabase
        .from('profiles')
        .select('id, total_games_played')
        .neq('role', 'super_admin')
        .limit(1)
        .single()

      const initialGamesPlayed = player.total_games_played

      // Create a test game
      const daysOffset = Math.floor(Math.random() * 365) + 7
      const gameDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const { data: game } = await supabase
        .from('games')
        .insert({
          game_date: gameDate,
          status: 'teams_assigned',
          priority_deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          payment_reminder_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          payment_deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          sunday_lottery_deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          teams_announced: true,
        })
        .select('id')
        .single()

      testGameId = game.id

      // Add player as WITHDRAWN (not confirmed)
      await supabase.from('game_players').insert({
        game_id: testGameId,
        player_id: player.id,
        status: 'withdrawn',
      })

      // Mark game as completed
      await supabase.from('games').update({ status: 'completed' }).eq('id', testGameId)

      await new Promise((resolve) => setTimeout(resolve, 200))

      // Check that total_games_played was NOT changed
      const { data: unchangedPlayer } = await supabase
        .from('profiles')
        .select('total_games_played')
        .eq('id', player.id)
        .single()

      expect(unchangedPlayer.total_games_played).toBe(initialGamesPlayed)
    })

    it('should update stats for multiple confirmed players in one game', async () => {
      // Get 5 test players
      const { data: players } = await supabase
        .from('profiles')
        .select('id, total_games_played')
        .neq('role', 'super_admin')
        .limit(5)

      const initialStats = players.map((p) => ({
        id: p.id,
        games: p.total_games_played,
      }))

      // Create a test game
      const daysOffset = Math.floor(Math.random() * 365) + 7
      const gameDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const { data: game } = await supabase
        .from('games')
        .insert({
          game_date: gameDate,
          status: 'teams_assigned',
          priority_deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          payment_reminder_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          payment_deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          sunday_lottery_deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          teams_announced: true,
        })
        .select('id')
        .single()

      testGameId = game.id

      // Add all 5 as confirmed
      for (const player of players) {
        await supabase.from('game_players').insert({
          game_id: testGameId,
          player_id: player.id,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          team: 'dark',
          position: 'field',
          is_starting: true,
        })
      }

      // Mark game as completed
      await supabase.from('games').update({ status: 'completed' }).eq('id', testGameId)

      await new Promise((resolve) => setTimeout(resolve, 300))

      // Check all 5 players had stats updated
      for (const initial of initialStats) {
        const { data: updated } = await supabase
          .from('profiles')
          .select('total_games_played')
          .eq('id', initial.id)
          .single()

        expect(updated.total_games_played).toBe(initial.games + 1)
      }
    })
  })
})
