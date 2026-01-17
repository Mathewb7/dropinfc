import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Creates a Supabase client for integration tests
 * This connects to the local Supabase instance running via Docker
 */
export function createTestSupabaseClient() {
  const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
  const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || ''

  if (!supabaseKey) {
    throw new Error(
      'TEST_SUPABASE_ANON_KEY is not set. Run `npx supabase start` and copy the anon key to .env.test'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}

/**
 * Creates an authenticated Supabase client for a specific test user
 * @param email - Email of the test user to authenticate as
 * @param password - Password (defaults to 'testpass123' for all test users)
 */
export async function createAuthenticatedTestClient(
  email: string,
  password: string = 'testpass123'
) {
  const client = createTestSupabaseClient()

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(`Failed to authenticate test user ${email}: ${error.message}`)
  }

  return { client, user: data.user, session: data.session }
}

/**
 * Helper to wait for real-time subscription to be ready
 */
export async function waitForSubscription(
  channel: any,
  timeout: number = 2000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Subscription timeout'))
    }, timeout)

    const checkStatus = () => {
      if (channel.state === 'joined') {
        clearTimeout(timer)
        resolve()
      } else {
        setTimeout(checkStatus, 100)
      }
    }

    checkStatus()
  })
}

/**
 * Helper to reset the test database
 * NOTE: This requires the TEST_SUPABASE_SERVICE_KEY to bypass RLS
 */
export async function resetTestDatabase() {
  const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
  const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY || ''

  if (!serviceKey) {
    throw new Error(
      'TEST_SUPABASE_SERVICE_KEY is not set. This is required to reset the database.'
    )
  }

  const client = createClient<Database>(supabaseUrl, serviceKey)

  // Truncate all tables
  await client.rpc('reset_test_db')

  return client
}

/**
 * Helper to seed the test database with 45 players
 * This should be called after resetTestDatabase()
 */
export async function seedTestDatabase() {
  const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
  const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY || ''

  if (!serviceKey) {
    throw new Error(
      'TEST_SUPABASE_SERVICE_KEY is not set. This is required to seed the database.'
    )
  }

  const client = createClient<Database>(supabaseUrl, serviceKey)

  // Note: Actual seeding done via SQL file
  // This function is a placeholder for programmatic seeding if needed
  // In tests, you would run: psql <connection> -f supabase/seed_45_players.sql

  return client
}
