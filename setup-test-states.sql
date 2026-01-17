-- Setup Test Dashboard States
-- Run this in Supabase Studio SQL Editor (http://127.0.0.1:54323)

-- Step 1: Clean up existing game_players for upcoming games
DELETE FROM game_players
WHERE game_id IN (
  SELECT id FROM games
  WHERE game_date >= CURRENT_DATE
);

-- Step 2: Create a new upcoming game
INSERT INTO games (
  game_date,
  status,
  priority_deadline,
  payment_reminder_time,
  payment_deadline,
  sunday_lottery_deadline,
  teams_announced
) VALUES (
  CURRENT_DATE + INTERVAL '3 days', -- Game in 3 days
  'waitlist_open', -- Waitlist is open
  CURRENT_DATE + INTERVAL '1 day', -- Priority deadline tomorrow
  CURRENT_DATE + INTERVAL '2 days', -- Payment reminder in 2 days
  CURRENT_DATE + INTERVAL '2 days' + INTERVAL '23 hours', -- Payment deadline
  CURRENT_DATE + INTERVAL '3 days' - INTERVAL '1 hour', -- Lottery deadline
  false -- Teams not announced yet
)
RETURNING id;

-- Step 3: Get the game ID and setup players
DO $$
DECLARE
  v_game_id uuid;
  v_player1 uuid;
  v_player2 uuid;
  v_player3 uuid;
  v_player4 uuid;
  v_player5 uuid;
  v_player6 uuid;
  v_player7 uuid;
  v_player8 uuid;
BEGIN
  -- Get the game we just created
  SELECT id INTO v_game_id
  FROM games
  WHERE game_date >= CURRENT_DATE
  ORDER BY game_date ASC
  LIMIT 1;

  -- Get player IDs
  SELECT id INTO v_player1 FROM profiles WHERE email = 'player01@dropin.test';
  SELECT id INTO v_player2 FROM profiles WHERE email = 'player02@dropin.test';
  SELECT id INTO v_player3 FROM profiles WHERE email = 'player03@dropin.test';
  SELECT id INTO v_player4 FROM profiles WHERE email = 'player04@dropin.test';
  SELECT id INTO v_player5 FROM profiles WHERE email = 'player05@dropin.test';
  SELECT id INTO v_player6 FROM profiles WHERE email = 'player06@dropin.test';
  SELECT id INTO v_player7 FROM profiles WHERE email = 'player07@dropin.test';
  SELECT id INTO v_player8 FROM profiles WHERE email = 'player08@dropin.test';

  -- STATE 1: Priority Invited (not yet confirmed)
  INSERT INTO game_players (game_id, player_id, status, payment_status)
  VALUES (v_game_id, v_player1, 'priority_invited', 'pending');

  -- STATE 2: Priority Confirmed (unpaid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at)
  VALUES (v_game_id, v_player2, 'priority_confirmed', 'pending', NOW());

  -- STATE 3: Priority Confirmed (paid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at)
  VALUES (v_game_id, v_player3, 'priority_confirmed', 'marked_paid', NOW(), NOW());

  -- STATE 4: On Waitlist
  INSERT INTO game_players (game_id, player_id, status, payment_status, joined_waitlist_at)
  VALUES (v_game_id, v_player4, 'waitlist', 'pending', NOW());

  -- STATE 5: Priority Declined
  INSERT INTO game_players (game_id, player_id, status, payment_status)
  VALUES (v_game_id, v_player5, 'priority_declined', 'pending');

  -- STATE 6: Withdrawn
  INSERT INTO game_players (game_id, player_id, status, payment_status)
  VALUES (v_game_id, v_player6, 'withdrawn', 'pending');

  -- STATE 7: Lottery Selected (unpaid)
  INSERT INTO game_players (game_id, player_id, status, payment_status)
  VALUES (v_game_id, v_player7, 'lottery_selected', 'pending');

  -- STATE 8: Lottery Selected (paid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, paid_at)
  VALUES (v_game_id, v_player8, 'lottery_selected', 'marked_paid', NOW());

  RAISE NOTICE '✅ Test states created successfully!';
  RAISE NOTICE 'Game ID: %', v_game_id;
END $$;

-- Step 4: Verify the results
SELECT
  p.email,
  gp.status as player_status,
  gp.payment_status,
  g.status as game_status,
  TO_CHAR(g.game_date, 'YYYY-MM-DD') as game_date
FROM game_players gp
JOIN profiles p ON gp.player_id = p.id
JOIN games g ON gp.game_id = g.id
WHERE g.game_date >= CURRENT_DATE
ORDER BY p.email;
