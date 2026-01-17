/**
 * Fix team assignments: change from 5 field + 2 subs to 4 field + 3 subs per team
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixTeamSubs() {
  console.log('🔧 Fixing team assignments (5+2 → 4+3)...\n')

  // Get the upcoming game with teams announced
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, game_date')
    .eq('teams_announced', true)
    .gte('game_date', new Date().toISOString().split('T')[0])
    .order('game_date', { ascending: true })
    .limit(1)
    .single()

  if (gameError || !game) {
    console.error('❌ No upcoming game with teams announced found:', gameError)
    return
  }

  console.log(`📅 Found game: ${game.game_date} (ID: ${game.id})\n`)

  // Process each team
  for (const team of ['dark', 'light'] as const) {
    console.log(`\n⚽ Processing ${team.toUpperCase()} team...`)

    // Get all field players who are starting for this team
    const { data: fieldStarters, error: fetchError } = await supabase
      .from('game_players')
      .select('id, player_id, profiles!inner(display_name)')
      .eq('game_id', game.id)
      .eq('team', team)
      .eq('position', 'field')
      .eq('is_starting', true)

    if (fetchError) {
      console.error(`❌ Error fetching ${team} field starters:`, fetchError)
      continue
    }

    if (!fieldStarters || fieldStarters.length <= 4) {
      console.log(`   Already has ${fieldStarters?.length || 0} field starters (≤4), skipping`)
      continue
    }

    console.log(`   Found ${fieldStarters.length} field starters, need to move 1 to subs`)

    // Move the last field starter to subs
    const playerToMove = fieldStarters[fieldStarters.length - 1]
    const playerName = (playerToMove as any).profiles?.display_name || 'Unknown'

    const { error: updateError } = await supabase
      .from('game_players')
      .update({ is_starting: false })
      .eq('id', playerToMove.id)

    if (updateError) {
      console.error(`❌ Error updating player:`, updateError)
    } else {
      console.log(`   ✅ Moved "${playerName}" to subs`)
    }
  }

  console.log('\n✅ Team assignments fixed!')
  console.log('   Each team now has: 1 keeper + 4 field + 3 subs')
}

fixTeamSubs().catch(console.error)
