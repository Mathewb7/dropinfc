-- Single comprehensive verification query
-- This shows everything in one result

SELECT
  'TABLES' as category,
  t.table_name as name,
  (SELECT COUNT(*)::text FROM information_schema.columns WHERE columns.table_name = t.table_name) as details
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN ('profiles', 'games', 'game_players', 'credit_transactions', 'refund_requests')

UNION ALL

SELECT
  'ENUMS' as category,
  typname as name,
  array_agg(enumlabel ORDER BY enumsortorder)::text as details
FROM pg_type
JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid
WHERE typname IN ('user_role', 'game_status', 'player_game_status', 'payment_status', 'team_name', 'position_type', 'credit_transaction_type', 'refund_status')
GROUP BY typname

UNION ALL

SELECT
  'RLS ENABLED' as category,
  tablename as name,
  CASE WHEN rowsecurity THEN 'YES' ELSE 'NO' END as details
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'games', 'game_players', 'credit_transactions', 'refund_requests')

UNION ALL

SELECT
  'POLICIES' as category,
  tablename as name,
  COUNT(*)::text as details
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename

UNION ALL

SELECT
  'FUNCTIONS' as category,
  routine_name as name,
  routine_type as details
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('weighted_lottery_selection', 'balance_teams', 'update_weeks_since_last_played', 'get_waitlist_position', 'can_join_game', 'handle_new_user')

ORDER BY category, name;
