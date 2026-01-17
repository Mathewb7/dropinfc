-- Create simple test data with just a game and your account
-- This avoids auth.users foreign key issues

-- Create a test game for next Tuesday
INSERT INTO games (id, game_date, status, priority_deadline, payment_reminder_time, payment_deadline, teams_announced)
VALUES (
  gen_random_uuid(),
  -- Next Tuesday at 8:30 PM
  date_trunc('week', CURRENT_DATE) + INTERVAL '1 week' + INTERVAL '1 day' + TIME '20:30:00',
  'waitlist_open',
  -- Priority deadline: Tomorrow at 12 PM
  CURRENT_TIMESTAMP + INTERVAL '1 day',
  -- Payment reminder: 2 days from now at 6 PM
  CURRENT_TIMESTAMP + INTERVAL '2 days',
  -- Payment deadline: 3 days from now at 11:59 PM
  CURRENT_TIMESTAMP + INTERVAL '3 days',
  false
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Add yourself to the game as priority confirmed
DO $$
DECLARE
  v_game_id UUID;
  v_your_id UUID;
BEGIN
  -- Get the game we just created
  SELECT id INTO v_game_id FROM games ORDER BY created_at DESC LIMIT 1;

  -- Get your user ID
  SELECT id INTO v_your_id FROM profiles WHERE email = 'mathewbailey1990@gmail.com';

  -- Add you to the game as priority confirmed (paid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at)
  VALUES (
    v_game_id,
    v_your_id,
    'priority_confirmed',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (game_id, player_id) DO NOTHING;

  RAISE NOTICE 'Game created! You are registered as priority confirmed and paid.';
  RAISE NOTICE 'Game ID: %', v_game_id;
END $$;

-- Show the game details
SELECT
  g.id,
  g.game_date,
  g.status,
  COUNT(gp.id) as total_players
FROM games g
LEFT JOIN game_players gp ON g.id = gp.game_id
WHERE g.game_date > CURRENT_TIMESTAMP
GROUP BY g.id, g.game_date, g.status
ORDER BY g.game_date
LIMIT 1;
