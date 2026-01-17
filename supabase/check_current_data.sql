-- Check current game data
-- Run this in Supabase SQL Editor to see what's actually in your database

-- 1. Check the latest game
SELECT
  id,
  game_date,
  status,
  priority_deadline,
  created_at
FROM games
ORDER BY created_at DESC
LIMIT 1;

-- 2. Count game_players for the latest game
SELECT
  COUNT(*) as total_players,
  COUNT(CASE WHEN status IN ('priority_confirmed', 'lottery_selected', 'confirmed') THEN 1 END) as confirmed_players,
  COUNT(CASE WHEN status = 'waitlist' THEN 1 END) as waitlist_players
FROM game_players
WHERE game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1);

-- 3. List all game_players for latest game
SELECT
  gp.status,
  gp.payment_status,
  gp.player_id,
  p.display_name,
  p.email
FROM game_players gp
LEFT JOIN profiles p ON gp.player_id = p.id
WHERE gp.game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1)
ORDER BY gp.status, p.display_name;

-- 4. Check if YOUR account is in the game
SELECT
  gp.status,
  gp.payment_status,
  p.display_name,
  p.email
FROM game_players gp
JOIN profiles p ON gp.player_id = p.id
WHERE gp.game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1)
  AND p.email = 'mathewbailey1990@gmail.com';

-- 5. Count total profiles in database
SELECT
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN email LIKE '%@test.com' THEN 1 END) as test_profiles
FROM profiles;
