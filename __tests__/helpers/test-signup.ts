/**
 * Test using signUp instead of admin.createUser
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(__dirname, '../../.env.test') })

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.TEST_SUPABASE_ANON_KEY || ''

console.log('Using anon key instead of service key')
console.log('Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, anonKey)

async function testSignUp() {
  console.log('\nAttempting to sign up test user...')

  const testEmail = `signup-test-${Date.now()}@dropin.test`

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'testpass123',
  })

  if (error) {
    console.error('\n❌ SignUp Error:', error)
  } else {
    console.log('\n✅ Success! User signed up:', data.user?.email)
    console.log('User ID:', data.user?.id)
    console.log('Confirmation required?:', data.user?.confirmation_sent_at ? 'Yes' : 'No')

    // Check if profile was created
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user!.id)
      .single()

    if (profileError) {
      console.log('\n❌ Profile not found:', profileError.message)
    } else {
      console.log('\n✅ Profile created:', profile)
    }
  }
}

testSignUp()
