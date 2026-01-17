-- PRODUCTION CLEANUP SCRIPT
-- Safely removes test users that may have leaked into production
-- RUN THIS ONLY ON PRODUCTION DATABASE

-- ⚠️ WARNING: This will delete users with @dropin.test email addresses
-- Make sure you are connected to PRODUCTION, not your local test database!

BEGIN;

-- Show what will be deleted (for confirmation)
SELECT
  'USERS TO DELETE:' as action,
  email,
  created_at
FROM auth.users
WHERE email LIKE '%@dropin.test';

-- Uncomment below to actually delete (requires manual confirmation)
-- DELETE FROM auth.users WHERE email LIKE '%@dropin.test';

-- Note: Profiles will be cascade-deleted due to foreign key constraint
-- Note: All related game_players, credit_transactions will also be cascade-deleted

ROLLBACK; -- Change to COMMIT when ready to execute
