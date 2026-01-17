-- ===================================================================
-- Database Reset Script for Testing
-- ===================================================================
-- This script completely resets the test database to a clean state
-- Use this before running test suites to ensure consistency

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = 'replica';

-- Truncate all tables in dependency order
TRUNCATE refund_requests CASCADE;
TRUNCATE credit_transactions CASCADE;
TRUNCATE game_players CASCADE;
TRUNCATE games CASCADE;
TRUNCATE profiles CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Reset any sequences if needed
-- (UUID generation doesn't use sequences, so not needed here)

-- Verify clean state
SELECT 'Tables after reset:' as status;
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'games', COUNT(*) FROM games
UNION ALL
SELECT 'game_players', COUNT(*) FROM game_players
UNION ALL
SELECT 'credit_transactions', COUNT(*) FROM credit_transactions
UNION ALL
SELECT 'refund_requests', COUNT(*) FROM refund_requests;

-- Success message
SELECT 'Database reset complete! Ready for seeding.' as message;
