-- Create test data WITHOUT auth.users dependency
-- This version adds test players to an existing game

-- Part 1: Temporarily disable foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Part 2: Create test player profiles (no auth.users needed)
INSERT INTO profiles (
  id,
  email,
  display_name,
  whatsapp_name,
  is_permanent_keeper,
  skill_rating,
  total_games_played,
  weeks_since_last_played,
  times_started_as_sub,
  role
)
VALUES
  -- Priority confirmed players (8 total)
  (gen_random_uuid(), 'john.keeper@test.com', 'John Keeper', 'John K', true, 4, 15, 1, 2, 'player'),
  (gen_random_uuid(), 'mike.striker@test.com', 'Mike Striker', 'Mike S', false, 5, 20, 0, 1, 'player'),
  (gen_random_uuid(), 'sarah.mid@test.com', 'Sarah Mid', 'Sarah M', false, 4, 18, 2, 3, 'player'),
  (gen_random_uuid(), 'david.defense@test.com', 'David Defense', 'David D', false, 3, 12, 1, 4, 'player'),
  (gen_random_uuid(), 'emma.speed@test.com', 'Emma Speed', 'Emma S', false, 5, 22, 0, 0, 'player'),
  (gen_random_uuid(), 'alex.allround@test.com', 'Alex Allround', 'Alex A', false, 4, 16, 1, 2, 'player'),
  (gen_random_uuid(), 'lisa.tactical@test.com', 'Lisa Tactical', 'Lisa T', false, 4, 14, 2, 1, 'player'),
  (gen_random_uuid(), 'tom.power@test.com', 'Tom Power', 'Tom P', false, 5, 19, 0, 1, 'player'),

  -- Additional confirmed players (7 more = 15 total confirmed + you = 16)
  (gen_random_uuid(), 'nina.nimble@test.com', 'Nina Nimble', 'Nina N', false, 3, 10, 3, 5, 'player'),
  (gen_random_uuid(), 'ryan.reliable@test.com', 'Ryan Reliable', 'Ryan R', false, 4, 17, 1, 2, 'player'),
  (gen_random_uuid(), 'sophia.skill@test.com', 'Sophia Skill', 'Sophia S', false, 5, 21, 0, 0, 'player'),
  (gen_random_uuid(), 'carlos.create@test.com', 'Carlos Create', 'Carlos C', false, 4, 15, 1, 3, 'player'),
  (gen_random_uuid(), 'olivia.wing@test.com', 'Olivia Wing', 'Olivia W', false, 4, 13, 2, 2, 'player'),
  (gen_random_uuid(), 'james.rock@test.com', 'James Rock', 'James R', false, 3, 8, 4, 6, 'player'),
  (gen_random_uuid(), 'lucy.fast@test.com', 'Lucy Fast', 'Lucy F', false, 5, 16, 1, 1, 'player'),

  -- Waitlist players (5 total)
  (gen_random_uuid(), 'noah.waiting@test.com', 'Noah Waiting', 'Noah W', false, 3, 5, 5, 8, 'player'),
  (gen_random_uuid(), 'mia.eager@test.com', 'Mia Eager', 'Mia E', false, 4, 6, 6, 7, 'player'),
  (gen_random_uuid(), 'lucas.patient@test.com', 'Lucas Patient', 'Lucas P', false, 3, 3, 8, 10, 'player'),
  (gen_random_uuid(), 'ava.hopeful@test.com', 'Ava Hopeful', 'Ava H', false, 4, 7, 3, 5, 'player'),
  (gen_random_uuid(), 'ethan.next@test.com', 'Ethan Next', 'Ethan N', false, 3, 2, 10, 12, 'player')
ON CONFLICT (email) DO NOTHING;

-- Part 3: Add players to the most recent game
DO $$
DECLARE
  v_game_id UUID;
  v_your_id UUID;
BEGIN
  -- Get the most recent game
  SELECT id INTO v_game_id FROM games ORDER BY created_at DESC LIMIT 1;

  IF v_game_id IS NULL THEN
    RAISE EXCEPTION 'No game found! Please create a game first.';
  END IF;

  -- Get your user ID
  SELECT id INTO v_your_id FROM profiles WHERE email = 'mathewbailey1990@gmail.com';

  IF v_your_id IS NULL THEN
    RAISE EXCEPTION 'Your profile not found!';
  END IF;

  RAISE NOTICE 'Adding players to game: %', v_game_id;
  RAISE NOTICE 'Your player ID: %', v_your_id;

  -- Add YOU as priority confirmed and verified paid
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at)
  VALUES (
    v_game_id,
    v_your_id,
    'priority_confirmed',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
  )
  ON CONFLICT (game_id, player_id)
  DO UPDATE SET
    status = 'priority_confirmed',
    payment_status = 'verified',
    confirmed_at = CURRENT_TIMESTAMP - INTERVAL '2 days',
    paid_at = CURRENT_TIMESTAMP - INTERVAL '1 day';

  -- Add 5 priority confirmed players (verified paid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at)
  SELECT
    v_game_id,
    id,
    'priority_confirmed',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
  FROM profiles
  WHERE email IN (
    'john.keeper@test.com',
    'mike.striker@test.com',
    'sarah.mid@test.com',
    'david.defense@test.com',
    'emma.speed@test.com'
  )
  ON CONFLICT (game_id, player_id) DO NOTHING;

  -- Add 4 priority confirmed players (marked paid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at)
  SELECT
    v_game_id,
    id,
    'priority_confirmed',
    'marked_paid',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP
  FROM profiles
  WHERE email IN (
    'alex.allround@test.com',
    'lisa.tactical@test.com',
    'tom.power@test.com',
    'nina.nimble@test.com'
  )
  ON CONFLICT (game_id, player_id) DO NOTHING;

  -- Add 3 priority confirmed players (unpaid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at)
  SELECT
    v_game_id,
    id,
    'priority_confirmed',
    'pending',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
  FROM profiles
  WHERE email IN (
    'ryan.reliable@test.com',
    'sophia.skill@test.com',
    'carlos.create@test.com'
  )
  ON CONFLICT (game_id, player_id) DO NOTHING;

  -- Add 3 confirmed players (various payment statuses)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at)
  SELECT
    v_game_id,
    id,
    'confirmed',
    CASE
      WHEN email = 'olivia.wing@test.com' THEN 'verified'
      WHEN email = 'james.rock@test.com' THEN 'marked_paid'
      ELSE 'pending'
    END,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CASE
      WHEN email IN ('olivia.wing@test.com', 'james.rock@test.com') THEN CURRENT_TIMESTAMP
      ELSE NULL
    END
  FROM profiles
  WHERE email IN (
    'olivia.wing@test.com',
    'james.rock@test.com',
    'lucy.fast@test.com'
  )
  ON CONFLICT (game_id, player_id) DO NOTHING;

  -- Add 5 waitlist players
  INSERT INTO game_players (game_id, player_id, status, joined_waitlist_at)
  SELECT
    v_game_id,
    id,
    'waitlist',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
  FROM profiles
  WHERE email IN (
    'noah.waiting@test.com',
    'mia.eager@test.com',
    'lucas.patient@test.com',
    'ava.hopeful@test.com',
    'ethan.next@test.com'
  )
  ON CONFLICT (game_id, player_id) DO NOTHING;

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE '=================================';
  RAISE NOTICE 'YOU + 15 test players = 16 confirmed';
  RAISE NOTICE '  - 6 verified paid (including you)';
  RAISE NOTICE '  - 4 marked paid';
  RAISE NOTICE '  - 3 unpaid priority';
  RAISE NOTICE '  - 3 confirmed (2 paid, 1 unpaid)';
  RAISE NOTICE '  - 5 on waitlist';
  RAISE NOTICE '=================================';
END $$;

-- Part 4: Verify the data was inserted
SELECT
  'Summary' as info,
  (SELECT COUNT(*) FROM profiles WHERE email LIKE '%@test.com') as test_profiles_created,
  (SELECT COUNT(*) FROM game_players WHERE game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1)) as total_game_players,
  (SELECT COUNT(*) FROM game_players WHERE game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1) AND status IN ('priority_confirmed', 'lottery_selected', 'confirmed')) as confirmed_players,
  (SELECT COUNT(*) FROM game_players WHERE game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1) AND payment_status IN ('verified', 'marked_paid')) as paid_players;

-- Show all players in the game
SELECT
  gp.status,
  gp.payment_status,
  p.display_name,
  p.email
FROM game_players gp
JOIN profiles p ON gp.player_id = p.id
WHERE gp.game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1)
ORDER BY
  CASE gp.status
    WHEN 'priority_confirmed' THEN 1
    WHEN 'confirmed' THEN 2
    WHEN 'lottery_selected' THEN 3
    WHEN 'waitlist' THEN 4
    ELSE 5
  END,
  p.display_name;
