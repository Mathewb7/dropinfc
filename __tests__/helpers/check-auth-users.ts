/**
 * Check auth.users table directly
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
  db: {
    schema: 'auth',
  },
})

async function checkAuthUsers() {
  console.log('Checking auth.users table...\n')

  //Try to query auth.users (may not work due to RLS)
  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .limit(5)

  if (error) {
    console.log('Cannot query auth.users (expected due to RLS):', error.message)
  } else {
    console.log('Auth users count:', count)
    console.log('Sample users:', data)
  }

  // Try using admin API to list users
  console.log('\nTrying admin.listUsers()...')
  const { data: adminData, error: adminError } = await supabase.auth.admin.listUsers()

  if (adminError) {
    console.error('❌ Admin list failed:', adminError)
  } else {
    console.log(`✅ Found ${adminData.users.length} auth users`)
    if (adminData.users.length > 0) {
      console.log('Sample:', adminData.users[0].email)
    }
  }
}

checkAuthUsers()
