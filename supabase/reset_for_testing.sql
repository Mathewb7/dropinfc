-- Reset your account and James Hope's credit for proper testing

-- 1. Reset YOUR status back to priority confirmed and verified
UPDATE game_players
SET
  status = 'priority_confirmed',
  payment_status = 'verified',
  confirmed_at = CURRENT_TIMESTAMP - INTERVAL '2 days',
  paid_at = CURRENT_TIMESTAMP - INTERVAL '1 day'
WHERE player_id = (SELECT id FROM profiles WHERE email = 'mathewbailey1990@gmail.com')
  AND game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1);

-- 2. Reset your credit balance to $0
UPDATE profiles
SET credit_balance = 0.00
WHERE email = 'mathewbailey1990@gmail.com';

-- 3. Delete any incorrect credit transactions for you
DELETE FROM credit_transactions
WHERE player_id = (SELECT id FROM profiles WHERE email = 'mathewbailey1990@gmail.com');

-- 4. Reset James Hope's credit balance to $0
UPDATE profiles
SET credit_balance = 0.00
WHERE email LIKE 'james%';

-- 5. Delete James Hope's incorrect credit transactions
DELETE FROM credit_transactions
WHERE player_id = (SELECT id FROM profiles WHERE email LIKE 'james%');

-- Verify
SELECT
  p.display_name,
  p.email,
  p.credit_balance,
  gp.status,
  gp.payment_status
FROM profiles p
LEFT JOIN game_players gp ON p.id = gp.player_id
  AND gp.game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1)
WHERE p.email IN ('mathewbailey1990@gmail.com', 'james.hope@test.com', 'james@test.com');
