/**
 * Setup test data to demonstrate all dashboard states
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Use service role key for admin operations (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupTestStates() {
  console.log('🔧 Setting up test dashboard states...\n')

  // Delete existing game_players for upcoming games
  const { data: upcomingGames } = await supabase
    .from('games')
    .select('id')
    .gte('game_date', new Date().toISOString().split('T')[0])

  if (upcomingGames && upcomingGames.length > 0) {
    await supabase
      .from('game_players')
      .delete()
      .in('game_id', upcomingGames.map(g => g.id))
  }

  // Create or get an upcoming game
  const gameDate = new Date()
  gameDate.setDate(gameDate.getDate() + 3) // 3 days from now

  const priorityDeadline = new Date()
  priorityDeadline.setDate(priorityDeadline.getDate() + 1) // Tomorrow

  const paymentDeadline = new Date()
  paymentDeadline.setDate(paymentDeadline.getDate() + 2)
  paymentDeadline.setHours(23, 59, 59)

  const lotteryDeadline = new Date(gameDate)
  lotteryDeadline.setHours(lotteryDeadline.getHours() - 1)

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      game_date: gameDate.toISOString().split('T')[0],
      status: 'waitlist_open',
      priority_deadline: priorityDeadline.toISOString(),
      payment_reminder_time: paymentDeadline.toISOString(),
      payment_deadline: paymentDeadline.toISOString(),
      sunday_lottery_deadline: lotteryDeadline.toISOString(),
      teams_announced: false
    })
    .select()
    .single()

  if (gameError || !game) {
    console.error('❌ Error creating game:', gameError)
    return
  }

  console.log('✅ Game created:', game.id)
  console.log(`   Date: ${game.game_date}`)
  console.log(`   Status: ${game.status}\n`)

  // Get test player IDs
  const { data: players } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', [
      'player1@dropin.test',
      'player2@dropin.test',
      'player3@dropin.test',
      'player4@dropin.test',
      'player5@dropin.test',
      'player6@dropin.test',
      'player7@dropin.test',
      'player8@dropin.test'
    ])
    .order('email')

  if (!players || players.length < 8) {
    console.error('❌ Not enough test players found')
    return
  }

  const testStates = [
    {
      email: players[0].email,
      playerId: players[0].id,
      status: 'priority_invited',
      paymentStatus: 'pending',
      description: 'Priority Invited (not confirmed)',
      extraData: {}
    },
    {
      email: players[1].email,
      playerId: players[1].id,
      status: 'priority_confirmed',
      paymentStatus: 'pending',
      description: 'Priority Confirmed (unpaid)',
      extraData: { confirmed_at: new Date().toISOString() }
    },
    {
      email: players[2].email,
      playerId: players[2].id,
      status: 'priority_confirmed',
      paymentStatus: 'marked_paid',
      description: 'Priority Confirmed (paid)',
      extraData: {
        confirmed_at: new Date().toISOString(),
        paid_at: new Date().toISOString()
      }
    },
    {
      email: players[3].email,
      playerId: players[3].id,
      status: 'waitlist',
      paymentStatus: 'pending',
      description: 'On Waitlist',
      extraData: { joined_waitlist_at: new Date().toISOString() }
    },
    {
      email: players[4].email,
      playerId: players[4].id,
      status: 'priority_declined',
      paymentStatus: 'pending',
      description: 'Priority Declined',
      extraData: {}
    },
    {
      email: players[5].email,
      playerId: players[5].id,
      status: 'withdrawn',
      paymentStatus: 'pending',
      description: 'Withdrawn',
      extraData: {}
    },
    {
      email: players[6].email,
      playerId: players[6].id,
      status: 'lottery_selected',
      paymentStatus: 'pending',
      description: 'Lottery Selected (unpaid)',
      extraData: {}
    },
    {
      email: players[7].email,
      playerId: players[7].id,
      status: 'lottery_selected',
      paymentStatus: 'marked_paid',
      description: 'Lottery Selected (paid)',
      extraData: { paid_at: new Date().toISOString() }
    }
  ]

  // Insert all test states
  for (const state of testStates) {
    const { error } = await supabase
      .from('game_players')
      .insert({
        game_id: game.id,
        player_id: state.playerId,
        status: state.status,
        payment_status: state.paymentStatus,
        ...state.extraData
      })

    if (error) {
      console.error(`❌ Error creating state for ${state.email}:`, error)
    } else {
      console.log(`✅ ${state.email}: ${state.description}`)
    }
  }

  console.log('\n✅ Test states created successfully!')
  console.log('\n📋 Dashboard States to Test:')
  console.log('─'.repeat(60))
  console.log('1. player1@dropin.test - Priority Invited')
  console.log('   → Should see "Join Game" and "Cannot Come" buttons')
  console.log('\n2. player2@dropin.test - Priority Confirmed (unpaid)')
  console.log('   → Should see "Mark Payment Sent" button with confirmation dialog')
  console.log('\n3. player3@dropin.test - Priority Confirmed (paid)')
  console.log('   → Should see only game info, no action buttons')
  console.log('\n4. player4@dropin.test - On Waitlist')
  console.log('   → Should see "Leave Waitlist" button')
  console.log('\n5. player5@dropin.test - Priority Declined')
  console.log('   → Should see "Join Waitlist" button (if waitlist open)')
  console.log('\n6. player6@dropin.test - Withdrawn')
  console.log('   → Should see "Join Waitlist" button (if waitlist open)')
  console.log('\n7. player7@dropin.test - Lottery Selected (unpaid)')
  console.log('   → Should see "Mark Payment Sent" and "Withdraw" buttons')
  console.log('\n8. player8@dropin.test - Lottery Selected (paid)')
  console.log('   → Should see only game info, no action buttons')
  console.log('\n9. player9@dropin.test - Not Registered')
  console.log('   → Should see big "Join Waitlist" button and lottery info')
  console.log('─'.repeat(60))
  console.log('\n🔐 All test users have password: testpass123')
  console.log('🌐 Login at: http://localhost:3000/login\n')
}

setupTestStates().catch(console.error)
