-- Verification Query for DropIn FC Schema
-- Run this in Supabase SQL Editor to verify all tables were created

-- Check all tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'games', 'game_players', 'credit_transactions', 'refund_requests')
ORDER BY table_name;

-- Check all enums exist
SELECT
  typname as enum_name,
  array_agg(enumlabel ORDER BY enumsortorder) as enum_values
FROM pg_type
JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid
WHERE typname IN ('user_role', 'game_status', 'player_game_status', 'payment_status', 'team_name', 'position_type', 'credit_transaction_type', 'refund_status')
GROUP BY typname
ORDER BY typname;

-- Check RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'games', 'game_players', 'credit_transactions', 'refund_requests')
ORDER BY tablename;

-- Count policies
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check functions exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('weighted_lottery_selection', 'balance_teams', 'update_weeks_since_last_played', 'get_waitlist_position', 'can_join_game', 'handle_new_user')
ORDER BY routine_name;
