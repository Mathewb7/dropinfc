/**
 * Test login with the properly-created test user
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(__dirname, '../../.env.test') })

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.TEST_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, anonKey)

async function testProperUser() {
  console.log('Testing login with properly-created user...\n')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'testuser@dropin.test',
    password: 'testpass123',
  })

  if (error) {
    console.error('❌ Login FAILED:', error.message)
    console.log('\nThis means even with all fields set correctly, login doesn\'t work.')
    console.log('The problem is deeper than just missing fields.')
  } else {
    console.log('✅ Login SUCCESSFUL!')
    console.log('   User ID:', data.user.id)
    console.log('   Email:', data.user.email)
    console.log('\n🎉 This means our field additions WORK!')
    console.log('   Now we need to update the main seed file with these fields.')

    await supabase.auth.signOut()
  }
}

testProperUser()
