-- ===================================================================
-- PROPER Seed file for 45 realistic test players
-- ===================================================================
-- This creates test data in the CORRECT order:
-- 1. Create auth.users (ID cards)
-- 2. Trigger auto-creates profiles (lockers)
-- 3. Update profiles with detailed stats (fill lockers)
-- ===================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Clean up existing data (in reverse dependency order)
TRUNCATE credit_transactions, refund_requests, game_players, games, profiles, strike_settings CASCADE;
DELETE FROM auth.users WHERE email LIKE '%@dropin.test';

-- Insert default strike settings (required for admin strikes page)
INSERT INTO strike_settings (strikes_before_cooldown, cooldown_weeks)
VALUES (3, 3);

-- ===================================================================
-- PART 1: Create Auth Users (This triggers profile creation!)
-- ===================================================================

DO $$
DECLARE
  user_id UUID;
  user_email TEXT;
  i INTEGER;
BEGIN
  -- Admin user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'admin@dropin.test',
    crypt('testpass123', gen_salt('bf')),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Test Admin"}',
    FALSE,
    'authenticated',
    'authenticated'
  ) RETURNING id INTO user_id;

  RAISE NOTICE 'Created admin user: %', user_id;

  -- Super Admin user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'superadmin@dropin.test',
    crypt('testpass123', gen_salt('bf')),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Test Super Admin"}',
    FALSE,
    'authenticated',
    'authenticated'
  );

  -- 2 Permanent Keepers
  FOR i IN 1..2 LOOP
    user_email := 'keeper' || i || '@dropin.test';
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone_change,
      phone_change_token,
      reauthentication_token,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      user_email,
      crypt('testpass123', gen_salt('bf')),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('display_name', 'Test Keeper ' || i),
      FALSE,
      'authenticated',
      'authenticated'
    );
    RAISE NOTICE 'Created keeper: %', user_email;
  END LOOP;

  -- 45 Regular Players
  FOR i IN 1..45 LOOP
    user_email := 'player' || LPAD(i::TEXT, 2, '0') || '@dropin.test';
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone_change,
      phone_change_token,
      reauthentication_token,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      user_email,
      crypt('testpass123', gen_salt('bf')),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('display_name', 'Test Player ' || i),
      FALSE,
      'authenticated',
      'authenticated'
    );

    IF i % 10 = 0 THEN
      RAISE NOTICE 'Created % players...', i;
    END IF;
  END LOOP;

  -- Special striker user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'striker@dropin.test',
    crypt('testpass123', gen_salt('bf')),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Test Striker"}',
    FALSE,
    'authenticated',
    'authenticated'
  );

  RAISE NOTICE 'Auth users created! Profiles should be auto-created by trigger.';
END $$;

-- Wait a moment for triggers to complete
SELECT pg_sleep(1);

-- ===================================================================
-- PART 2: Update Profiles with Detailed Stats
-- ===================================================================

DO $$
DECLARE
  profile_record RECORD;
  player_num INTEGER;
BEGIN
  RAISE NOTICE 'Updating profiles with detailed stats...';

  -- Update Admin
  UPDATE profiles
  SET
    display_name = 'Test Admin',
    whatsapp_name = 'ADMIN',
    role = 'admin',
    skill_rating = 4,
    total_games_played = 30,
    weeks_since_last_played = 0,
    times_started_as_sub = 3,
    times_started_as_keeper = 0,
    credit_balance = 0,
    withdrawal_strikes = 0
  WHERE email = 'admin@dropin.test';

  -- Update Super Admin
  UPDATE profiles
  SET
    display_name = 'Test Super Admin',
    whatsapp_name = 'SUPER',
    role = 'super_admin',
    skill_rating = 5,
    total_games_played = 50,
    weeks_since_last_played = 0,
    times_started_as_sub = 1,
    times_started_as_keeper = 0,
    credit_balance = 0,
    withdrawal_strikes = 0
  WHERE email = 'superadmin@dropin.test';

  -- Update Keepers
  UPDATE profiles
  SET
    display_name = 'Test Keeper 1',
    whatsapp_name = 'TK01',
    is_permanent_keeper = TRUE,
    skill_rating = 4,
    total_games_played = 25,
    weeks_since_last_played = 0,
    times_started_as_sub = 0,
    times_started_as_keeper = 20,
    credit_balance = 0,
    withdrawal_strikes = 0
  WHERE email = 'keeper1@dropin.test';

  UPDATE profiles
  SET
    display_name = 'Test Keeper 2',
    whatsapp_name = 'TK02',
    is_permanent_keeper = TRUE,
    skill_rating = 3,
    total_games_played = 30,
    weeks_since_last_played = 1,
    times_started_as_sub = 0,
    times_started_as_keeper = 25,
    credit_balance = 0,
    withdrawal_strikes = 0
  WHERE email = 'keeper2@dropin.test';

  -- Update Players 01-10 (High-skill regulars)
  FOR player_num IN 1..10 LOOP
    UPDATE profiles
    SET
      display_name = 'Test Player ' || player_num,
      whatsapp_name = 'TP' || LPAD(player_num::TEXT, 2, '0'),
      is_permanent_keeper = FALSE,
      skill_rating = CASE WHEN player_num <= 5 THEN 5 ELSE 4 END,
      total_games_played = 35 + player_num,
      weeks_since_last_played = CASE WHEN player_num <= 5 THEN 0 ELSE 1 END,
      times_started_as_sub = 1 + (player_num % 3),
      times_started_as_keeper = 0,
      credit_balance = 0,
      withdrawal_strikes = 0
    WHERE email = 'player' || LPAD(player_num::TEXT, 2, '0') || '@dropin.test';
  END LOOP;

  -- Update Players 11-30 (Medium-skill mixed attendance)
  FOR player_num IN 11..30 LOOP
    UPDATE profiles
    SET
      display_name = 'Test Player ' || player_num,
      whatsapp_name = 'TP' || LPAD(player_num::TEXT, 2, '0'),
      is_permanent_keeper = FALSE,
      skill_rating = CASE WHEN player_num % 2 = 0 THEN 4 ELSE 3 END,
      total_games_played = 10 + (player_num - 10) * 2,
      weeks_since_last_played = 2 + ((player_num - 10) % 5),
      times_started_as_sub = 3 + ((player_num - 10) % 8),
      times_started_as_keeper = 0,
      credit_balance = CASE WHEN player_num % 3 = 0 THEN 15.00 ELSE 0 END,
      withdrawal_strikes = CASE WHEN player_num % 7 = 0 THEN 1 ELSE 0 END
    WHERE email = 'player' || LPAD(player_num::TEXT, 2, '0') || '@dropin.test';
  END LOOP;

  -- Update Players 31-43 (Low-frequency with strikes)
  FOR player_num IN 31..43 LOOP
    UPDATE profiles
    SET
      display_name = 'Test Player ' || player_num,
      whatsapp_name = 'TP' || LPAD(player_num::TEXT, 2, '0'),
      is_permanent_keeper = FALSE,
      skill_rating = CASE WHEN player_num % 2 = 0 THEN 3 ELSE 2 END,
      total_games_played = 2 + (player_num - 30),
      weeks_since_last_played = 7 + ((player_num - 30) % 6),
      times_started_as_sub = 10 + ((player_num - 30) % 5),
      times_started_as_keeper = 0,
      credit_balance = CASE WHEN player_num % 4 = 0 THEN 30.00 ELSE 0 END,
      withdrawal_strikes = CASE
        WHEN player_num IN (31, 32) THEN 3
        WHEN player_num IN (33, 34) THEN 2
        WHEN player_num = 35 THEN 1
        ELSE 0
      END,
      strike_cooldown_until = CASE
        WHEN player_num = 31 THEN NOW() + INTERVAL '2 weeks'
        WHEN player_num = 32 THEN NOW() + INTERVAL '3 weeks'
        ELSE NULL
      END
    WHERE email = 'player' || LPAD(player_num::TEXT, 2, '0') || '@dropin.test';
  END LOOP;

  -- Update Players 44-45
  FOR player_num IN 44..45 LOOP
    UPDATE profiles
    SET
      display_name = 'Test Player ' || player_num,
      whatsapp_name = 'TP' || LPAD(player_num::TEXT, 2, '0'),
      is_permanent_keeper = FALSE,
      skill_rating = 3,
      total_games_played = 5 + player_num,
      weeks_since_last_played = 4,
      times_started_as_sub = 8,
      times_started_as_keeper = 0,
      credit_balance = 0,
      withdrawal_strikes = 0
    WHERE email = 'player' || LPAD(player_num::TEXT, 2, '0') || '@dropin.test';
  END LOOP;

  -- Update Striker
  UPDATE profiles
  SET
    display_name = 'Test Striker',
    whatsapp_name = 'STRIKER',
    is_permanent_keeper = FALSE,
    skill_rating = 4,
    total_games_played = 25,
    weeks_since_last_played = 2,
    times_started_as_sub = 5,
    times_started_as_keeper = 0,
    credit_balance = 0,
    withdrawal_strikes = 3,
    strike_cooldown_until = NOW() + INTERVAL '2 weeks'
  WHERE email = 'striker@dropin.test';

  RAISE NOTICE 'Profile stats updated!';
END $$;

-- ===================================================================
-- PART 3: Create Test Game Scenarios
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
    SELECT player_id FROM game_players WHERE game_id = '00000000-0000-0000-0000-000000000002'
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
-- PART 4: Create Sample Credit Transactions & Refund Requests
-- ===================================================================

-- Credit transactions
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

-- Refund requests
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
-- Verification & Summary
-- ===================================================================

DO $$
DECLARE
  auth_count INTEGER;
  profile_count INTEGER;
  game_count INTEGER;
  gp_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users WHERE email LIKE '%@dropin.test';
  SELECT COUNT(*) INTO profile_count FROM profiles WHERE email LIKE '%@dropin.test';
  SELECT COUNT(*) INTO game_count FROM games;
  SELECT COUNT(*) INTO gp_count FROM game_players;

  RAISE NOTICE '';
  RAISE NOTICE '=== SEEDING COMPLETE ===';
  RAISE NOTICE 'Auth users created: %', auth_count;
  RAISE NOTICE 'Profiles created: %', profile_count;
  RAISE NOTICE 'Games created: %', game_count;
  RAISE NOTICE 'Game players created: %', gp_count;
  RAISE NOTICE '';
  RAISE NOTICE 'All test users have password: testpass123';
  RAISE NOTICE '=========================';
END $$;
