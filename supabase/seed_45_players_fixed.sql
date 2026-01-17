-- ===================================================================
-- Seed file for 45 realistic test players + scenarios for testing
-- ===================================================================
-- This creates a complete test environment with 45 players covering
-- all edge cases for lottery, team balancing, strikes, and credits

-- Reset all tables
TRUNCATE profiles, games, game_players, credit_transactions, refund_requests CASCADE;
TRUNCATE auth.users CASCADE;

-- ===================================================================
-- PART 1: Create 45 Test Players with Varied Characteristics
-- ===================================================================

DO $$
DECLARE
  player_id UUID;
  i INTEGER;
BEGIN
  -- 2 Permanent Keepers
  FOR i IN 1..2 LOOP
    player_id := gen_random_uuid();

    -- Create auth user
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
      player_id,
      'keeper' || i || '@dropin.test',
      crypt('testpass123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated',
      'authenticated'
    );

    -- Create profile
    INSERT INTO profiles (id, email, display_name, whatsapp_name, is_permanent_keeper, skill_rating,
                          total_games_played, weeks_since_last_played, times_started_as_sub,
                          times_started_as_keeper, credit_balance, withdrawal_strikes, role)
    VALUES (
      player_id,
      'keeper' || i || '@dropin.test',
      'Test Keeper ' || i,
      'TK' || LPAD(i::TEXT, 2, '0'),
      true,
      CASE WHEN i = 1 THEN 4 ELSE 3 END,
      20 + i * 5,
      CASE WHEN i = 1 THEN 0 ELSE 1 END,
      0,
      15 + i * 5,
      0,
      0,
      'player'
    );
  END LOOP;

  -- 10 High-Skill Regular Players (skill 4-5, active, low weeks since last)
  FOR i IN 1..10 LOOP
    player_id := gen_random_uuid();

    -- Create auth user
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
      player_id,
      'player' || LPAD(i::TEXT, 2, '0') || '@dropin.test',
      crypt('testpass123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated',
      'authenticated'
    );

    -- Create profile
    INSERT INTO profiles (id, email, display_name, whatsapp_name, is_permanent_keeper, skill_rating,
                          total_games_played, weeks_since_last_played, times_started_as_sub,
                          credit_balance, withdrawal_strikes, role)
    VALUES (
      player_id,
      'player' || LPAD(i::TEXT, 2, '0') || '@dropin.test',
      'Test Player ' || i,
      'TP' || LPAD(i::TEXT, 2, '0'),
      false,
      CASE WHEN i <= 5 THEN 5 ELSE 4 END,
      35 + i,
      CASE WHEN i <= 5 THEN 0 ELSE 1 END,
      1 + (i % 3),
      0,
      0,
      'player'
    );
  END LOOP;

  -- 20 Medium-Skill Mixed Attendance Players (skill 3-4, weeks 2-6, some credits)
  FOR i IN 11..30 LOOP
    player_id := gen_random_uuid();

    -- Create auth user
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
      player_id,
      'player' || LPAD(i::TEXT, 2, '0') || '@dropin.test',
      crypt('testpass123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated',
      'authenticated'
    );

    -- Create profile
    INSERT INTO profiles (id, email, display_name, whatsapp_name, is_permanent_keeper, skill_rating,
                          total_games_played, weeks_since_last_played, times_started_as_sub,
                          credit_balance, withdrawal_strikes, role)
    VALUES (
      player_id,
      'player' || LPAD(i::TEXT, 2, '0') || '@dropin.test',
      'Test Player ' || i,
      'TP' || LPAD(i::TEXT, 2, '0'),
      false,
      CASE WHEN (i % 2) = 0 THEN 4 ELSE 3 END,
      10 + (i - 10) * 2,
      2 + ((i - 10) % 5),
      3 + ((i - 10) % 8),
      CASE WHEN (i % 3) = 0 THEN 15.00 ELSE 0 END,
      CASE WHEN (i % 7) = 0 THEN 1 ELSE 0 END,
      'player'
    );
  END LOOP;

  -- 13 Low-Frequency Players (skill 2-3, weeks 7-12, some strikes, some credits)
  FOR i IN 31..43 LOOP
    player_id := gen_random_uuid();

    -- Create auth user
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (
      player_id,
      'player' || LPAD(i::TEXT, 2, '0') || '@dropin.test',
      crypt('testpass123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated',
      'authenticated'
    );

    -- Create profile
    INSERT INTO profiles (id, email, display_name, whatsapp_name, is_permanent_keeper, skill_rating,
                          total_games_played, weeks_since_last_played, times_started_as_sub,
                          credit_balance, withdrawal_strikes, strike_cooldown_until, role)
    VALUES (
      player_id,
      'player' || LPAD(i::TEXT, 2, '0') || '@dropin.test',
      'Test Player ' || i,
      'TP' || LPAD(i::TEXT, 2, '0'),
      false,
      CASE WHEN (i % 2) = 0 THEN 3 ELSE 2 END,
      2 + (i - 30),
      7 + ((i - 30) % 6),
      10 + ((i - 30) % 5),
      CASE WHEN (i % 4) = 0 THEN 30.00 ELSE 0 END,
      CASE
        WHEN i = 31 THEN 3
        WHEN i = 32 THEN 3
        WHEN i = 33 THEN 2
        WHEN i = 34 THEN 2
        WHEN i = 35 THEN 1
        ELSE 0
      END,
      CASE
        WHEN i = 31 THEN NOW() + INTERVAL '2 weeks'
        WHEN i = 32 THEN NOW() + INTERVAL '3 weeks'
        ELSE NULL
      END,
      'player'
    );
  END LOOP;

  -- Admin user
  player_id := gen_random_uuid();

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    player_id,
    'admin@dropin.test',
    crypt('testpass123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  );

  INSERT INTO profiles (id, email, display_name, whatsapp_name, is_permanent_keeper, skill_rating,
                        total_games_played, weeks_since_last_played, times_started_as_sub,
                        credit_balance, withdrawal_strikes, role)
  VALUES (
    player_id,
    'admin@dropin.test',
    'Test Admin',
    'ADMIN',
    false,
    4,
    30,
    0,
    3,
    0,
    0,
    'admin'
  );

  -- Super Admin user
  player_id := gen_random_uuid();

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    player_id,
    'superadmin@dropin.test',
    crypt('testpass123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  );

  INSERT INTO profiles (id, email, display_name, whatsapp_name, is_permanent_keeper, skill_rating,
                        total_games_played, weeks_since_last_played, times_started_as_sub,
                        credit_balance, withdrawal_strikes, role)
  VALUES (
    player_id,
    'superadmin@dropin.test',
    'Test Super Admin',
    'SUPER',
    false,
    5,
    50,
    0,
    1,
    0,
    0,
    'super_admin'
  );
END $$;

-- ===================================================================
-- PART 2: Create Test Game Scenarios
-- ===================================================================

-- Scenario 1: Game in PRIORITY_OPEN phase
INSERT INTO games (id, game_date, status, priority_deadline, payment_reminder_time, payment_deadline, sunday_lottery_deadline, teams_announced)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  CURRENT_DATE + INTERVAL '10 days',
  'priority_open',
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '4 days',
  NOW() + INTERVAL '5 days',
  NOW() + INTERVAL '6 days',
  false
);

-- Add 12 priority players (8 confirmed, 4 pending)
INSERT INTO game_players (game_id, player_id, status, payment_status)
SELECT
  '00000000-0000-0000-0000-000000000001',
  id,
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY email) <= 8 THEN 'priority_confirmed'::player_game_status
    ELSE 'priority_invited'::player_game_status
  END,
  'pending'::payment_status
FROM profiles
WHERE email LIKE 'player%@dropin.test'
ORDER BY email
LIMIT 12;

-- Scenario 2: Game in WAITLIST_OPEN phase
INSERT INTO games (id, game_date, status, priority_deadline, payment_reminder_time, payment_deadline, sunday_lottery_deadline, teams_announced)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  CURRENT_DATE + INTERVAL '7 days',
  'waitlist_open',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '3 days',
  NOW() + INTERVAL '4 days',
  false
);

-- Add 16 confirmed players
INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at)
SELECT
  '00000000-0000-0000-0000-000000000002',
  id,
  'confirmed'::player_game_status,
  'pending'::payment_status,
  NOW() - INTERVAL '1 day'
FROM profiles
WHERE email LIKE 'player%@dropin.test'
   OR email LIKE 'keeper%@dropin.test'
ORDER BY email
LIMIT 16;

-- Add 20 waitlist players
INSERT INTO game_players (game_id, player_id, status, payment_status, joined_waitlist_at)
SELECT
  '00000000-0000-0000-0000-000000000002',
  id,
  'waitlist'::player_game_status,
  'pending'::payment_status,
  NOW() - INTERVAL '1 hour' * ROW_NUMBER() OVER (ORDER BY email DESC)
FROM profiles
WHERE email LIKE 'player%@dropin.test'
  AND id NOT IN (
    SELECT player_id
    FROM game_players
    WHERE game_id = '00000000-0000-0000-0000-000000000002'
  )
  AND (strike_cooldown_until IS NULL OR strike_cooldown_until < NOW())
ORDER BY email DESC
LIMIT 20;

-- Scenario 3: Game in PAYMENT_PENDING phase
INSERT INTO games (id, game_date, status, priority_deadline, payment_reminder_time, payment_deadline, sunday_lottery_deadline, teams_announced)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  CURRENT_DATE + INTERVAL '5 days',
  'payment_pending',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 hour',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '2 days',
  false
);

-- Add 16 confirmed players with varied payment statuses
INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at)
SELECT
  '00000000-0000-0000-0000-000000000003',
  id,
  'confirmed'::player_game_status,
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY email) <= 8 THEN 'verified'::payment_status
    WHEN ROW_NUMBER() OVER (ORDER BY email) <= 12 THEN 'marked_paid'::payment_status
    ELSE 'pending'::payment_status
  END,
  NOW() - INTERVAL '3 days',
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY email) <= 12 THEN NOW() - INTERVAL '1 day'
    ELSE NULL
  END
FROM profiles
WHERE email LIKE 'player%@dropin.test'
   OR email LIKE 'keeper%@dropin.test'
ORDER BY email
LIMIT 16;

-- Scenario 4: Game with TEAMS_ASSIGNED
INSERT INTO games (id, game_date, status, priority_deadline, payment_reminder_time, payment_deadline, sunday_lottery_deadline, teams_announced)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  CURRENT_DATE + INTERVAL '3 days',
  'teams_assigned',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day',
  true
);

-- Add 16 confirmed, paid players with team assignments
WITH selected_players AS (
  SELECT
    id,
    is_permanent_keeper,
    skill_rating,
    ROW_NUMBER() OVER (PARTITION BY is_permanent_keeper ORDER BY email) as rn
  FROM profiles
  WHERE email LIKE 'player%@dropin.test'
     OR email LIKE 'keeper%@dropin.test'
  ORDER BY is_permanent_keeper DESC, skill_rating DESC, email
  LIMIT 16
)
INSERT INTO game_players (game_id, player_id, status, payment_status, confirmed_at, paid_at, team, position, is_starting)
SELECT
  '00000000-0000-0000-0000-000000000004',
  id,
  'confirmed'::player_game_status,
  'verified'::payment_status,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '2 days',
  CASE
    WHEN is_permanent_keeper AND rn = 1 THEN 'dark'::team_name
    WHEN is_permanent_keeper AND rn = 2 THEN 'light'::team_name
    WHEN (ROW_NUMBER() OVER (PARTITION BY is_permanent_keeper ORDER BY id) % 2) = 0 THEN 'dark'::team_name
    ELSE 'light'::team_name
  END,
  CASE
    WHEN is_permanent_keeper THEN 'keeper'::position_type
    WHEN ROW_NUMBER() OVER (PARTITION BY is_permanent_keeper ORDER BY id) > 12 THEN 'sub'::position_type
    ELSE 'field'::position_type
  END,
  CASE
    WHEN is_permanent_keeper THEN true
    WHEN ROW_NUMBER() OVER (PARTITION BY is_permanent_keeper ORDER BY id) <= 10 THEN true
    ELSE false
  END
FROM selected_players;

-- ===================================================================
-- PART 3: Create Sample Credit Transactions
-- ===================================================================

INSERT INTO credit_transactions (player_id, game_id, amount, type, notes, created_at)
SELECT
  p.id,
  '00000000-0000-0000-0000-000000000002',
  15.00,
  'credit_added'::credit_transaction_type,
  'Withdrawal credit from previous game',
  NOW() - INTERVAL '3 days'
FROM profiles p
WHERE p.credit_balance > 0
  AND p.email LIKE 'player%@dropin.test'
LIMIT 5;

-- ===================================================================
-- PART 4: Create Sample Refund Requests
-- ===================================================================

INSERT INTO refund_requests (player_id, game_id, amount, status, created_at)
SELECT
  p.id,
  '00000000-0000-0000-0000-000000000003',
  15.00,
  'pending'::refund_status,
  NOW() - INTERVAL '1 day'
FROM profiles p
WHERE p.email IN ('player15@dropin.test', 'player20@dropin.test', 'player25@dropin.test');

-- ===================================================================
-- Verify the seeding worked
-- ===================================================================

SELECT 'Profiles created:' as info, COUNT(*) as count FROM profiles;
SELECT 'Games created:' as info, COUNT(*) as count FROM games;
SELECT 'Game players created:' as info, COUNT(*) as count FROM game_players;
SELECT 'Credit transactions created:' as info, COUNT(*) as count FROM credit_transactions;
SELECT 'Refund requests created:' as info, COUNT(*) as count FROM refund_requests;
