-- Create comprehensive test data for DropIn FC
-- This will create a game, players, and various game participation scenarios

-- First, let's create test players (in addition to your existing account)
INSERT INTO profiles (id, email, display_name, whatsapp_name, is_permanent_keeper, skill_rating, total_games_played, weeks_since_last_played, times_started_as_sub, role)
VALUES
  -- Priority players
  (gen_random_uuid(), 'john.keeper@test.com', 'John the Keeper', 'John K', true, 4, 15, 1, 2, 'player'),
  (gen_random_uuid(), 'mike.striker@test.com', 'Mike Striker', 'Mike S', false, 5, 20, 0, 1, 'player'),
  (gen_random_uuid(), 'sarah.midfielder@test.com', 'Sarah Mid', 'Sarah M', false, 4, 18, 2, 3, 'player'),
  (gen_random_uuid(), 'david.defender@test.com', 'David Defense', 'David D', false, 3, 12, 1, 4, 'player'),
  (gen_random_uuid(), 'emma.speedster@test.com', 'Emma Speed', 'Emma S', false, 5, 22, 0, 0, 'player'),
  (gen_random_uuid(), 'alex.allround@test.com', 'Alex Allround', 'Alex A', false, 4, 16, 1, 2, 'player'),
  (gen_random_uuid(), 'lisa.tactical@test.com', 'Lisa Tactical', 'Lisa T', false, 4, 14, 2, 1, 'player'),
  (gen_random_uuid(), 'tom.powerhouse@test.com', 'Tom Power', 'Tom P', false, 5, 19, 0, 1, 'player'),
  (gen_random_uuid(), 'nina.nimble@test.com', 'Nina Nimble', 'Nina N', false, 3, 10, 3, 5, 'player'),
  (gen_random_uuid(), 'ryan.reliable@test.com', 'Ryan Reliable', 'Ryan R', false, 4, 17, 1, 2, 'player'),
  (gen_random_uuid(), 'sophia.skillful@test.com', 'Sophia Skill', 'Sophia S', false, 5, 21, 0, 0, 'player'),
  (gen_random_uuid(), 'carlos.creator@test.com', 'Carlos Create', 'Carlos C', false, 4, 15, 1, 3, 'player'),

  -- Waitlist players
  (gen_random_uuid(), 'james.hopeful@test.com', 'James Hopeful', 'James H', false, 3, 5, 5, 8, 'player'),
  (gen_random_uuid(), 'olivia.waiting@test.com', 'Olivia Waiting', 'Olivia W', false, 4, 8, 4, 6, 'player'),
  (gen_random_uuid(), 'lucas.patient@test.com', 'Lucas Patient', 'Lucas P', false, 3, 3, 8, 10, 'player'),
  (gen_random_uuid(), 'mia.eager@test.com', 'Mia Eager', 'Mia E', false, 4, 6, 6, 7, 'player'),
  (gen_random_uuid(), 'noah.nextup@test.com', 'Noah NextUp', 'Noah N', false, 3, 2, 10, 12, 'player')
ON CONFLICT (id) DO NOTHING;

-- Create a test game for next Tuesday
INSERT INTO games (id, game_date, status, priority_deadline, payment_reminder_time, payment_deadline, teams_announced)
VALUES (
  gen_random_uuid(),
  -- Next Tuesday at 8:30 PM
  date_trunc('week', CURRENT_DATE) + INTERVAL '1 week' + INTERVAL '1 day' + TIME '20:30:00',
  'waitlist_open',
  -- Priority deadline: Tomorrow at 12 PM (for testing purposes)
  CURRENT_TIMESTAMP + INTERVAL '1 day',
  -- Payment reminder: 2 days from now at 6 PM
  CURRENT_TIMESTAMP + INTERVAL '2 days',
  -- Payment deadline: 3 days from now at 11:59 PM
  CURRENT_TIMESTAMP + INTERVAL '3 days',
  false
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Get the game ID we just created
DO $$
DECLARE
  v_game_id UUID;
  v_john_id UUID;
  v_mike_id UUID;
  v_sarah_id UUID;
  v_david_id UUID;
  v_emma_id UUID;
  v_alex_id UUID;
  v_lisa_id UUID;
  v_tom_id UUID;
  v_nina_id UUID;
  v_ryan_id UUID;
  v_sophia_id UUID;
  v_carlos_id UUID;
  v_james_id UUID;
  v_olivia_id UUID;
  v_lucas_id UUID;
  v_mia_id UUID;
  v_noah_id UUID;
BEGIN
  -- Get the game ID
  SELECT id INTO v_game_id FROM games ORDER BY created_at DESC LIMIT 1;

  -- Get player IDs
  SELECT id INTO v_john_id FROM profiles WHERE email = 'john.keeper@test.com';
  SELECT id INTO v_mike_id FROM profiles WHERE email = 'mike.striker@test.com';
  SELECT id INTO v_sarah_id FROM profiles WHERE email = 'sarah.midfielder@test.com';
  SELECT id INTO v_david_id FROM profiles WHERE email = 'david.defender@test.com';
  SELECT id INTO v_emma_id FROM profiles WHERE email = 'emma.speedster@test.com';
  SELECT id INTO v_alex_id FROM profiles WHERE email = 'alex.allround@test.com';
  SELECT id INTO v_lisa_id FROM profiles WHERE email = 'lisa.tactical@test.com';
  SELECT id INTO v_tom_id FROM profiles WHERE email = 'tom.powerhouse@test.com';
  SELECT id INTO v_nina_id FROM profiles WHERE email = 'nina.nimble@test.com';
  SELECT id INTO v_ryan_id FROM profiles WHERE email = 'ryan.reliable@test.com';
  SELECT id INTO v_sophia_id FROM profiles WHERE email = 'sophia.skillful@test.com';
  SELECT id INTO v_carlos_id FROM profiles WHERE email = 'carlos.creator@test.com';
  SELECT id INTO v_james_id FROM profiles WHERE email = 'james.hopeful@test.com';
  SELECT id INTO v_olivia_id FROM profiles WHERE email = 'olivia.waiting@test.com';
  SELECT id INTO v_lucas_id FROM profiles WHERE email = 'lucas.patient@test.com';
  SELECT id INTO v_mia_id FROM profiles WHERE email = 'mia.eager@test.com';
  SELECT id INTO v_noah_id FROM profiles WHERE email = 'noah.nextup@test.com';

  -- Add priority confirmed players (paid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at)
  VALUES
    (v_game_id, v_john_id, 'priority_confirmed', 'verified', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (v_game_id, v_mike_id, 'priority_confirmed', 'verified', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (v_game_id, v_sarah_id, 'priority_confirmed', 'marked_paid', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (v_game_id, v_david_id, 'priority_confirmed', 'marked_paid', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP);

  -- Add priority confirmed players (unpaid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at)
  VALUES
    (v_game_id, v_emma_id, 'priority_confirmed', 'pending', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (v_game_id, v_alex_id, 'priority_confirmed', 'pending', CURRENT_TIMESTAMP - INTERVAL '1 day');

  -- Add lottery selected players (paid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, selected_at, paid_at)
  VALUES
    (v_game_id, v_lisa_id, 'lottery_selected', 'verified', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP),
    (v_game_id, v_tom_id, 'lottery_selected', 'marked_paid', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP);

  -- Add lottery selected players (unpaid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, selected_at)
  VALUES
    (v_game_id, v_nina_id, 'lottery_selected', 'pending', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (v_game_id, v_ryan_id, 'lottery_selected', 'pending', CURRENT_TIMESTAMP - INTERVAL '1 day');

  -- Add confirmed players (paid)
  INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at)
  VALUES
    (v_game_id, v_sophia_id, 'confirmed', 'verified', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (v_game_id, v_carlos_id, 'confirmed', 'marked_paid', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP);

  -- Add waitlist players
  INSERT INTO game_players (game_id, player_id, status, joined_waitlist_at)
  VALUES
    (v_game_id, v_james_id, 'waitlist', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (v_game_id, v_olivia_id, 'waitlist', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (v_game_id, v_lucas_id, 'waitlist', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    (v_game_id, v_mia_id, 'waitlist', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (v_game_id, v_noah_id, 'waitlist', CURRENT_TIMESTAMP - INTERVAL '5 days');

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Game ID: %', v_game_id;
  RAISE NOTICE 'Total players in game: 17 (12 confirmed/selected, 5 on waitlist)';
  RAISE NOTICE '- 12 confirmed/selected players (8 paid, 4 unpaid)';
  RAISE NOTICE '- 5 waitlist players';
END $$;

-- Display summary
SELECT
  'Test Data Summary' as info,
  (SELECT COUNT(*) FROM profiles WHERE email LIKE '%@test.com') as test_players_created,
  (SELECT COUNT(*) FROM games WHERE game_date > CURRENT_TIMESTAMP) as upcoming_games,
  (SELECT COUNT(*) FROM game_players WHERE status IN ('priority_confirmed', 'lottery_selected', 'confirmed')) as confirmed_players,
  (SELECT COUNT(*) FROM game_players WHERE status = 'waitlist') as waitlist_players;
