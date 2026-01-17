/**
 * Test script to create a single user and see detailed error
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(__dirname, '../../.env.test') })

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY || ''

console.log('Supabase URL:', supabaseUrl)
console.log('Service Key (first 20 chars):', serviceKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testCreateUser() {
  console.log('\nAttempting to create test user...')

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test-user-single@dropin.test',
      password: 'testpass123',
      email_confirm: true,
    })

    if (error) {
      console.error('\n❌ Error object:', JSON.stringify(error, null, 2))
      console.error('\nError name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error status:', error.status)
    } else {
      console.log('\n✅ Success! User created:', data.user?.email)
      console.log('User ID:', data.user?.id)
    }
  } catch (err: any) {
    console.error('\n❌ Caught exception:')
    console.error('Type:', typeof err)
    console.error('Name:', err.name)
    console.error('Message:', err.message)
    console.error('Stack:', err.stack)
  }
}

testCreateUser()
