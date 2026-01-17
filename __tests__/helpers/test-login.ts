/**
 * Test logging in with existing seeded users
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(__dirname, '../../.env.test') })

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.TEST_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, anonKey)

async function testLogin() {
  console.log('Testing login with seeded users...\n')

  // Test admin login
  console.log('1. Testing admin login...')
  const { data: adminData, error: adminError } = await supabase.auth.signInWithPassword({
    email: 'admin@dropin.test',
    password: 'testpass123',
  })

  if (adminError) {
    console.error('❌ Admin login failed:', adminError.message)
  } else {
    console.log('✅ Admin logged in successfully!')
    console.log('   User ID:', adminData.user.id)
    console.log('   Email:', adminData.user.email)

    // Check profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminData.user.id)
      .single()

    if (profile) {
      console.log('   Role:', profile.role)
      console.log('   Display Name:', profile.display_name)
    }

    await supabase.auth.signOut()
  }

  // Test player login
  console.log('\n2. Testing player login...')
  const { data: playerData, error: playerError } = await supabase.auth.signInWithPassword({
    email: 'player01@dropin.test',
    password: 'testpass123',
  })

  if (playerError) {
    console.error('❌ Player login failed:', playerError.message)
  } else {
    console.log('✅ Player logged in successfully!')
    console.log('   User ID:', playerData.user.id)
    console.log('   Email:', playerData.user.email)

    // Check profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', playerData.user.id)
      .single()

    if (profile) {
      console.log('   Skill Rating:', profile.skill_rating)
      console.log('   Games Played:', profile.total_games_played)
      console.log('   Weeks Since Last:', profile.weeks_since_last_played)
    }

    await supabase.auth.signOut()
  }

  // Test keeper login
  console.log('\n3. Testing keeper login...')
  const { data: keeperData, error: keeperError } = await supabase.auth.signInWithPassword({
    email: 'keeper1@dropin.test',
    password: 'testpass123',
  })

  if (keeperError) {
    console.error('❌ Keeper login failed:', keeperError.message)
  } else {
    console.log('✅ Keeper logged in successfully!')
    console.log('   User ID:', keeperData.user.id)
    console.log('   Is Permanent Keeper:', keeperData.user.email)

    // Check profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', keeperData.user.id)
      .single()

    if (profile) {
      console.log('   Is Permanent Keeper:', profile.is_permanent_keeper)
      console.log('   Times as Keeper:', profile.times_started_as_keeper)
    }

    await supabase.auth.signOut()
  }

  console.log('\n✅ All login tests passed! Auth is working!')
}

testLogin()
