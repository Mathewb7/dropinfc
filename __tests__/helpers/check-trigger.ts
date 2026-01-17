/**
 * Check if manual profile creation works
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

async function checkDatabase() {
  console.log('Testing manual profile creation...\n')

  const testId = '12345678-1234-1234-1234-123456789012'
  const testEmail = `manual-${Date.now()}@test.com`

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: testId,
      email: testEmail,
      display_name: 'Test Manual',
    })
    .select()
    .single()

  if (profileError) {
    console.error('❌ Manual profile insertion failed:', profileError)
  } else {
    console.log('✅ Manual profile created:', profile)

    // Clean up
    await supabase.from('profiles').delete().eq('id', testId)
    console.log('✅ Cleanup successful')
  }

  // Check current profiles count
  const { count, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  console.log('\nCurrent profiles count:', count, countError || '')
}

checkDatabase()
