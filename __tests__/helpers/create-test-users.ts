/**
 * Helper script to create test auth users for E2E testing
 *
 * This script:
 * 1. Deletes existing profiles (since they have random UUIDs)
 * 2. Creates auth users (trigger creates basic profiles with matching UUIDs)
 * 3. Updates profiles with proper stats from seed data
 *
 * Run this before E2E tests:
 * npx tsx __tests__/helpers/create-test-users.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env.test
config({ path: resolve(__dirname, '../../.env.test') })

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY || ''

console.log('Using Supabase URL:', supabaseUrl)
console.log('Service key present:', !!serviceKey)

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface TestUser {
  email: string
  password: string
  role: 'player' | 'admin' | 'super_admin'
  displayName: string
  whatsappName: string
  isPermanentKeeper: boolean
  skillRating: number
  totalGamesPlayed: number
  weeksSinceLastPlayed: number
  timesStartedAsSub: number
  timesStartedAsKeeper: number
  creditBalance: number
  withdrawalStrikes: number
  strikeCooldownUntil?: string | null
}

// Define all test users with their full profile data
const testUsers: TestUser[] = [
  // Admin users
  {
    email: 'admin@dropin.test',
    password: 'testpass123',
    role: 'admin',
    displayName: 'Test Admin',
    whatsappName: 'ADMIN',
    isPermanentKeeper: false,
    skillRating: 4,
    totalGamesPlayed: 30,
    weeksSinceLastPlayed: 0,
    timesStartedAsSub: 3,
    timesStartedAsKeeper: 0,
    creditBalance: 0,
    withdrawalStrikes: 0,
  },
  {
    email: 'superadmin@dropin.test',
    password: 'testpass123',
    role: 'super_admin',
    displayName: 'Test Super Admin',
    whatsappName: 'SUPER',
    isPermanentKeeper: false,
    skillRating: 5,
    totalGamesPlayed: 50,
    weeksSinceLastPlayed: 0,
    timesStartedAsSub: 1,
    timesStartedAsKeeper: 0,
    creditBalance: 0,
    withdrawalStrikes: 0,
  },

  // 2 Permanent Keepers
  ...Array.from({ length: 2 }, (_, i) => ({
    email: `keeper${i + 1}@dropin.test`,
    password: 'testpass123',
    role: 'player' as const,
    displayName: `Test Keeper ${i + 1}`,
    whatsappName: `TK${(i + 1).toString().padStart(2, '0')}`,
    isPermanentKeeper: true,
    skillRating: i === 0 ? 4 : 3,
    totalGamesPlayed: 20 + (i + 1) * 5,
    weeksSinceLastPlayed: i === 0 ? 0 : 1,
    timesStartedAsSub: 0,
    timesStartedAsKeeper: 15 + (i + 1) * 5,
    creditBalance: 0,
    withdrawalStrikes: 0,
  })),

  // 10 High-skill regular players (skill 4-5, active)
  ...Array.from({ length: 10 }, (_, i) => ({
    email: `player${(i + 1).toString().padStart(2, '0')}@dropin.test`,
    password: 'testpass123',
    role: 'player' as const,
    displayName: `Test Player ${i + 1}`,
    whatsappName: `TP${(i + 1).toString().padStart(2, '0')}`,
    isPermanentKeeper: false,
    skillRating: i < 5 ? 5 : 4,
    totalGamesPlayed: 35 + (i + 1),
    weeksSinceLastPlayed: i < 5 ? 0 : 1,
    timesStartedAsSub: 1 + ((i + 1) % 3),
    timesStartedAsKeeper: 0,
    creditBalance: 0,
    withdrawalStrikes: 0,
  })),

  // 20 Medium-skill mixed attendance (skill 3-4, weeks 2-6, some credits/strikes)
  ...Array.from({ length: 20 }, (_, i) => ({
    email: `player${(i + 11).toString().padStart(2, '0')}@dropin.test`,
    password: 'testpass123',
    role: 'player' as const,
    displayName: `Test Player ${i + 11}`,
    whatsappName: `TP${(i + 11).toString().padStart(2, '0')}`,
    isPermanentKeeper: false,
    skillRating: (i + 11) % 2 === 0 ? 4 : 3,
    totalGamesPlayed: 10 + i * 2,
    weeksSinceLastPlayed: 2 + (i % 5),
    timesStartedAsSub: 3 + (i % 8),
    timesStartedAsKeeper: 0,
    creditBalance: (i + 11) % 3 === 0 ? 15.0 : 0,
    withdrawalStrikes: (i + 11) % 7 === 0 ? 1 : 0,
  })),

  // 13 Low-frequency players (skill 2-3, weeks 7-12, strikes)
  ...Array.from({ length: 13 }, (_, i) => {
    const playerNum = i + 31
    return {
      email: `player${playerNum.toString().padStart(2, '0')}@dropin.test`,
      password: 'testpass123',
      role: 'player' as const,
      displayName: `Test Player ${playerNum}`,
      whatsappName: `TP${playerNum.toString().padStart(2, '0')}`,
      isPermanentKeeper: false,
      skillRating: playerNum % 2 === 0 ? 3 : 2,
      totalGamesPlayed: 2 + i,
      weeksSinceLastPlayed: 7 + (i % 6),
      timesStartedAsSub: 10 + (i % 5),
      timesStartedAsKeeper: 0,
      creditBalance: playerNum % 4 === 0 ? 30.0 : 0,
      withdrawalStrikes:
        playerNum === 31 || playerNum === 32
          ? 3
          : playerNum === 33 || playerNum === 34
            ? 2
            : playerNum === 35
              ? 1
              : 0,
      strikeCooldownUntil:
        playerNum === 31
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          : playerNum === 32
            ? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
            : null,
    }
  }),

  // Special striker test user
  {
    email: 'striker@dropin.test',
    password: 'testpass123',
    role: 'player' as const,
    displayName: 'Test Striker',
    whatsappName: 'STRIKER',
    isPermanentKeeper: false,
    skillRating: 4,
    totalGamesPlayed: 25,
    weeksSinceLastPlayed: 2,
    timesStartedAsSub: 5,
    timesStartedAsKeeper: 0,
    creditBalance: 0,
    withdrawalStrikes: 3,
    strikeCooldownUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

async function createTestUsers() {
  console.log('🚀 Starting test user creation...\n')

  // Step 1: Delete existing profiles (keeping games/game_players)
  console.log('Step 1: Cleaning existing profiles...')
  const { error: deleteError } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  if (deleteError) {
    console.error('⚠️  Warning: Could not delete existing profiles:', deleteError.message)
  } else {
    console.log('✓ Existing profiles cleaned\n')
  }

  // Step 2: Create auth users and update profiles
  console.log('Step 2: Creating auth users and profiles...')
  let created = 0
  let existing = 0
  let failed = 0

  for (const user of testUsers) {
    try {
      // Create auth user (trigger will create basic profile)
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      })

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          existing++
          console.log(`⊙ ${user.email} (already exists)`)
        } else {
          console.error(`✗ ${user.email}: ${error.message}`)
          failed++
        }
      } else if (data.user) {
        // Update profile with full data
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            display_name: user.displayName,
            whatsapp_name: user.whatsappName,
            is_permanent_keeper: user.isPermanentKeeper,
            skill_rating: user.skillRating,
            total_games_played: user.totalGamesPlayed,
            weeks_since_last_played: user.weeksSinceLastPlayed,
            times_started_as_sub: user.timesStartedAsSub,
            times_started_as_keeper: user.timesStartedAsKeeper,
            credit_balance: user.creditBalance,
            withdrawal_strikes: user.withdrawalStrikes,
            strike_cooldown_until: user.strikeCooldownUntil || null,
            role: user.role,
          })
          .eq('id', data.user.id)

        if (updateError) {
          console.error(`✗ ${user.email}: Profile update failed - ${updateError.message}`)
          failed++
        } else {
          created++
          console.log(`✓ ${user.email}`)
        }
      }
    } catch (err: any) {
      console.error(`✗ ${user.email}: ${err.message}`)
      failed++
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  console.log('\n=== Summary ===')
  console.log(`✓ Created: ${created}`)
  console.log(`⊙ Already existing: ${existing}`)
  console.log(`✗ Failed: ${failed}`)
  console.log(`━ Total: ${testUsers.length}`)
  console.log('\n🎉 Test users ready for E2E testing!')
}

createTestUsers().catch((error) => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
