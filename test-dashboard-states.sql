-- Test Dashboard States Setup
-- This script creates a game with players in different states to test all dashboard views

-- Clean up existing game_players for upcoming games
DELETE FROM game_players WHERE game_id IN (
  SELECT id FROM games WHERE game_date >= CURRENT_DATE
);

-- Create or update an upcoming game
INSERT INTO games (
  id,
  game_date,
  status,
  priority_deadline,
  payment_reminder_time,
  payment_deadline,
  lottery_deadline,
  teams_announced
) VALUES (
  gen_random_uuid(),
  CURRENT_DATE + INTERVAL '3 days', -- Game in 3 days
  'waitlist_open', -- Waitlist is open
  CURRENT_DATE + INTERVAL '1 day', -- Priority deadline tomorrow
  CURRENT_DATE + INTERVAL '2 days', -- Payment reminder in 2 days
  CURRENT_DATE + INTERVAL '2 days' + INTERVAL '23 hours', -- Payment deadline
  CURRENT_DATE + INTERVAL '3 days' - INTERVAL '1 hour', -- Lottery deadline
  false -- Teams not announced yet
)
ON CONFLICT (id) DO UPDATE SET
  game_date = EXCLUDED.game_date,
  status = EXCLUDED.status,
  priority_deadline = EXCLUDED.priority_deadline,
  payment_reminder_time = EXCLUDED.payment_reminder_time,
  payment_deadline = EXCLUDED.payment_deadline,
  lottery_deadline = EXCLUDED.lottery_deadline,
  teams_announced = EXCLUDED.teams_announced
RETURNING id;

-- Get the game ID (for inserting players)
DO $$
DECLARE
  v_game_id uuid;
  v_player1_id uuid;
  v_player2_id uuid;
  v_player3_id uuid;
  v_player4_id uuid;
  v_player5_id uuid;
  v_player6_id uuid;
  v_player7_id uuid;
  v_player8_id uuid;
BEGIN
  -- Get the game ID
  SELECT id INTO v_game_id FROM games
  WHERE game_date >= CURRENT_DATE
  ORDER BY game_date ASC
  LIMIT 1;

  -- Get player IDs
  SELECT id INTO v_player1_id FROM profiles WHERE email = 'player1@dropin.test';
  SELECT id INTO v_player2_id FROM profiles WHERE email = 'player2@dropin.test';
  SELECT id INTO v_player3_id FROM profiles WHERE email = 'player3@dropin.test';
  SELECT id INTO v_player4_id FROM profiles WHERE email = 'player4@dropin.test';
  SELECT id INTO v_player5_id FROM profiles WHERE email = 'player5@dropin.test';
  SELECT id INTO v_player6_id FROM profiles WHERE email = 'player6@dropin.test';
  SELECT id INTO v_player7_id FROM profiles WHERE email = 'player7@dropin.test';
  SELECT id INTO v_player8_id FROM profiles WHERE email = 'player8@dropin.test';

  -- STATE 1: Priority Invited (not yet confirmed)
  INSERT INTO game_players (game_id, player_id, status, payment_status)
  VALUES (v_game_id, v_player1_id, 'priority_invited', 'pending');

  -- STATE 2: Priority Confirmed (unpaid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at)
  VALUES (v_game_id, v_player2_id, 'priority_confirmed', 'pending', NOW());

  -- STATE 3: Priority Confirmed (paid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at)
  VALUES (v_game_id, v_player3_id, 'priority_confirmed', 'marked_paid', NOW(), NOW());

  -- STATE 4: On Waitlist
  INSERT INTO game_players (game_id, player_id, status, payment_status, joined_waitlist_at)
  VALUES (v_game_id, v_player4_id, 'waitlist', 'pending', NOW());

  -- STATE 5: Priority Declined
  INSERT INTO game_players (game_id, player_id, status, payment_status)
  VALUES (v_game_id, v_player5_id, 'priority_declined', 'pending');

  -- STATE 6: Withdrawn
  INSERT INTO game_players (game_id, player_id, status, payment_status)
  VALUES (v_game_id, v_player6_id, 'withdrawn', 'pending');

  -- STATE 7: Lottery Selected (unpaid)
  INSERT INTO game_players (game_id, player_id, status, payment_status)
  VALUES (v_game_id, v_player7_id, 'lottery_selected', 'pending');

  -- STATE 8: Lottery Selected (paid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, paid_at)
  VALUES (v_game_id, v_player8_id, 'lottery_selected', 'marked_paid', NOW());

  -- player9@dropin.test will NOT be registered (to test "not registered" view)

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Game ID: %', v_game_id;
END $$;

-- Show the results
SELECT
  p.email,
  gp.status as player_status,
  gp.payment_status,
  g.status as game_status,
  g.game_date
FROM game_players gp
JOIN profiles p ON gp.player_id = p.id
JOIN games g ON gp.game_id = g.id
WHERE g.game_date >= CURRENT_DATE
ORDER BY p.email;
