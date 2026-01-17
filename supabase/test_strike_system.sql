-- Test Script for Strike System
-- Run these step by step to test the strike system

-- SCENARIO 1: Player withdraws within 24 hours (should get strike)
-- ================================================================

-- Step 1: Reset Nina's strikes
UPDATE profiles
SET withdrawal_strikes = 0, strike_cooldown_until = NULL
WHERE email = 'nina@test.com';

-- Step 2: Verify Nina is confirmed for the game
SELECT
  p.display_name,
  gp.status,
  p.withdrawal_strikes,
  p.strike_cooldown_until
FROM profiles p
JOIN game_players gp ON p.id = gp.player_id
WHERE p.email = 'nina@test.com'
  AND gp.game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1);

-- Step 3: Nina withdraws from game (should trigger strike since game is within 24 hours)
UPDATE game_players
SET status = 'withdrawn'
WHERE player_id = (SELECT id FROM profiles WHERE email = 'nina@test.com')
  AND game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1);

-- Step 4: Check if strike was applied
SELECT
  display_name,
  withdrawal_strikes,
  strike_cooldown_until
FROM profiles
WHERE email = 'nina@test.com';
-- Expected: withdrawal_strikes = 1, strike_cooldown_until = NULL (not at threshold yet)

-- SCENARIO 2: Player gets 3rd strike (should trigger cooldown)
-- =============================================================

-- Step 5: Manually give Nina 2 more strikes
UPDATE profiles
SET withdrawal_strikes = 3
WHERE email = 'nina@test.com';

-- Step 6: Verify Nina now has 3 strikes but no cooldown yet
SELECT
  display_name,
  withdrawal_strikes,
  strike_cooldown_until
FROM profiles
WHERE email = 'nina@test.com';

-- Step 7: Set Nina back to waitlist, then withdraw again (4th strike triggers cooldown)
UPDATE game_players
SET status = 'waitlist'
WHERE player_id = (SELECT id FROM profiles WHERE email = 'nina@test.com')
  AND game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1);

UPDATE game_players
SET status = 'withdrawn'
WHERE player_id = (SELECT id FROM profiles WHERE email = 'nina@test.com')
  AND game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1);

-- Step 8: Check if cooldown was applied
SELECT
  display_name,
  withdrawal_strikes,
  strike_cooldown_until,
  strike_cooldown_until > NOW() as "Is in Cooldown"
FROM profiles
WHERE email = 'nina@test.com';
-- Expected: withdrawal_strikes = 4, strike_cooldown_until = NOW() + 3 weeks

-- SCENARIO 3: Test that cooldown prevents joining
-- ===============================================

-- Step 9: Try to check if Nina can join (should return false)
SELECT can_join_game((SELECT id FROM profiles WHERE email = 'nina@test.com')) as can_join;
-- Expected: false

-- SCENARIO 4: Admin changes settings (should not affect existing cooldowns)
-- =========================================================================

-- Step 10: Change cooldown duration to 1 week
UPDATE strike_settings
SET cooldown_weeks = 1
WHERE id = (SELECT id FROM strike_settings ORDER BY id DESC LIMIT 1);

-- Step 11: Verify Nina's cooldown didn't change (still 3 weeks from when applied)
SELECT
  display_name,
  strike_cooldown_until,
  EXTRACT(DAY FROM (strike_cooldown_until - NOW())) as "Days Until End"
FROM profiles
WHERE email = 'nina@test.com';
-- Expected: Still ~21 days (3 weeks), not 7 days

-- SCENARIO 5: Test strike reset after game completion
-- ===================================================

-- Step 12: Create Ryan as a player who completed game
UPDATE profiles
SET withdrawal_strikes = 2
WHERE email = 'ryan@test.com';

-- Step 13: Verify Ryan has 2 strikes
SELECT display_name, withdrawal_strikes
FROM profiles
WHERE email = 'ryan@test.com';

-- Step 14: Mark the game as completed
UPDATE games
SET status = 'completed'
WHERE id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1);

-- Step 15: Check if Ryan's strikes were reset
SELECT display_name, withdrawal_strikes
FROM profiles
WHERE email = 'ryan@test.com';
-- Expected: withdrawal_strikes = 0

-- CLEANUP: Reset everything back to testing state
-- ================================================

-- Reset game status
UPDATE games
SET status = 'waitlist_open'
WHERE id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1);

-- Reset Nina's strikes
UPDATE profiles
SET withdrawal_strikes = 3, strike_cooldown_until = NOW() + INTERVAL '3 weeks'
WHERE email = 'nina@test.com';

-- Reset Ryan's strikes
UPDATE profiles
SET withdrawal_strikes = 1, strike_cooldown_until = NULL
WHERE email = 'ryan@test.com';

-- Reset settings to defaults
UPDATE strike_settings
SET strikes_before_cooldown = 3, cooldown_weeks = 3
WHERE id = (SELECT id FROM strike_settings ORDER BY id DESC LIMIT 1);
