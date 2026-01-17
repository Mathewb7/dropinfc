/**
 * Step-by-step auth diagnosis
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(__dirname, '../../.env.test') })

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY || ''
const anonKey = process.env.TEST_SUPABASE_ANON_KEY || ''

console.log('🔍 Debugging Auth Issue Step-by-Step\n')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const userClient = createClient(supabaseUrl, anonKey)

async function diagnoseAuth() {
  console.log('STEP 1: Check if profile exists')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('WHY: If profile doesn\'t exist, the user definitely can\'t log in\n')

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('email', 'admin@dropin.test')
    .single()

  if (profileError) {
    console.error('❌ Profile not found:', profileError.message)
    console.log('\n🔴 PROBLEM: Admin user profile doesn\'t exist!')
    console.log('   Run: npx supabase db reset')
    return
  }

  console.log('✅ Profile exists!')
  console.log('   Email:', profile.email)
  console.log('   Role:', profile.role)
  console.log('   User ID:', profile.id)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('STEP 2: Try signing up a NEW user (to test auth works)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('WHY: If we can\'t create NEW users, auth service is broken\n')

  const testEmail = `test-${Date.now()}@example.com`
  const { data: signupData, error: signupError } = await userClient.auth.signUp({
    email: testEmail,
    password: 'password123',
  })

  if (signupError) {
    console.error('❌ Signup failed:', signupError.message)
    console.log('\n🔴 PROBLEM: Auth service can\'t create new users!')
    console.log('   This means there\'s a deeper issue with local Supabase')
  } else {
    console.log('✅ Can create new users!')
    console.log('   New user ID:', signupData.user?.id)

    // Clean up
    if (signupData.user?.id) {
      await adminClient.from('profiles').delete().eq('id', signupData.user.id)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('STEP 3: Try logging in with seeded user')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('WHY: This tells us if our seeded users work\n')

  const { data: loginData, error: loginError } = await userClient.auth.signInWithPassword({
    email: 'admin@dropin.test',
    password: 'testpass123',
  })

  if (loginError) {
    console.error('❌ Login failed:', loginError.message)
    console.log('\n🔴 PROBLEM: Seeded user can\'t log in!')
    console.log('   Error:', loginError.message)
    console.log('\n   Possible causes:')
    console.log('   1. Password encryption is wrong')
    console.log('   2. auth.identities is missing/wrong')
    console.log('   3. auth.users record is corrupted')
  } else {
    console.log('✅ Login successful!')
    console.log('   User ID:', loginData.user.id)
    console.log('   Email:', loginData.user.email)
    await userClient.auth.signOut()
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

diagnoseAuth()
