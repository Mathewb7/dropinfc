/**
 * Test creating user + profile manually without relying on trigger
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(__dirname, '../../.env.test') })

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testManualProfile() {
  console.log('Step 1: Check trigger status...')

  // Check if trigger exists
  const { data: triggers, error: triggerError } = await supabase
    .from('pg_trigger')
    .select('*')
    .eq('tgname', 'on_auth_user_created')

  if (triggerError) {
    console.log('Could not check triggers (expected):', triggerError.message)
  } else {
    console.log('Triggers found:', triggers)
  }

  console.log('\nStep 2: Trying to create auth user with user_metadata...')

  const testEmail = `manual-test-${Date.now()}@dropin.test`

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'testpass123',
    email_confirm: true,
    user_metadata: {
      display_name: 'Manual Test User',
    },
  })

  if (authError) {
    console.error('❌ Auth user creation failed:', authError)
    return
  }

  console.log('✅ Auth user created:', authData.user?.id)

  // Wait a bit for trigger to fire
  await new Promise((resolve) => setTimeout(resolve, 1000))

  console.log('\nStep 3: Check if profile was created by trigger...')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user!.id)
    .single()

  if (profileError) {
    console.log('❌ Profile NOT created by trigger:', profileError.message)

    console.log('\nStep 4: Manually creating profile...')

    const { data: manualProfile, error: manualError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user!.id,
        email: testEmail,
        display_name: 'Manual Test User',
        role: 'player',
      })
      .select()
      .single()

    if (manualError) {
      console.error('❌ Manual profile creation failed:', manualError)
    } else {
      console.log('✅ Manual profile created:', manualProfile)
    }
  } else {
    console.log('✅ Profile created by trigger:', profile)
  }
}

testManualProfile().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
