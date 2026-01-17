/**
 * Check if profiles exist (bypassing auth)
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

async function checkProfiles() {
  console.log('Checking profiles directly...\n')

  // Get profile count
  const { data: profiles, error, count } = await supabase
    .from('profiles')
    .select('email, role, skill_rating, display_name', { count: 'exact' })
    .order('email')
    .limit(10)

  if (error) {
    console.error('❌ Error fetching profiles:', error)
    return
  }

  console.log(`✅ Found ${count} total profiles`)
  console.log('\nFirst 10 profiles:')
  profiles?.forEach((p) => {
    console.log(`  - ${p.email} (${p.role}) - ${p.display_name}`)
  })

  // Check specific test users
  console.log('\nChecking specific test users:')

  const testEmails = ['admin@dropin.test', 'player01@dropin.test', 'keeper1@dropin.test']

  for (const email of testEmails) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (profile) {
      console.log(`✅ ${email}`)
      console.log(`   Role: ${profile.role}`)
      console.log(`   Skill: ${profile.skill_rating}`)
      console.log(`   Games: ${profile.total_games_played}`)
    } else {
      console.log(`❌ ${email} - NOT FOUND`)
    }
  }
}

checkProfiles()
