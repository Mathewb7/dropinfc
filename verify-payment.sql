-- Verify payment for player03 (to see the "Paid ✓" badge)
UPDATE game_players
SET payment_status = 'verified'
WHERE player_id = (SELECT id FROM profiles WHERE email = 'player03@dropin.test')
  AND game_id IN (SELECT id FROM games WHERE game_date >= CURRENT_DATE ORDER BY game_date ASC LIMIT 1);

-- Verify payment for player08 (to see the "Paid ✓" badge)
UPDATE game_players
SET payment_status = 'verified'
WHERE player_id = (SELECT id FROM profiles WHERE email = 'player08@dropin.test')
  AND game_id IN (SELECT id FROM games WHERE game_date >= CURRENT_DATE ORDER BY game_date ASC LIMIT 1);

-- Check the results
SELECT
  p.email,
  gp.status,
  gp.payment_status
FROM game_players gp
JOIN profiles p ON gp.player_id = p.id
WHERE gp.game_id IN (SELECT id FROM games WHERE game_date >= CURRENT_DATE ORDER BY game_date ASC LIMIT 1)
  AND p.email IN ('player03@dropin.test', 'player08@dropin.test');
