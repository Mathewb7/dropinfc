-- Check withdrawal data

-- 1. Check your current status in game_players
SELECT
  gp.status,
  gp.payment_status,
  gp.confirmed_at,
  gp.paid_at,
  p.display_name,
  p.email
FROM game_players gp
JOIN profiles p ON gp.player_id = p.id
WHERE p.email = 'mathewbailey1990@gmail.com'
  AND gp.game_id = (SELECT id FROM games ORDER BY created_at DESC LIMIT 1);

-- 2. Check your credit balance
SELECT
  display_name,
  email,
  credit_balance
FROM profiles
WHERE email = 'mathewbailey1990@gmail.com';

-- 3. Check credit transactions for you
SELECT
  ct.amount,
  ct.type,
  ct.notes,
  ct.created_at,
  p.display_name
FROM credit_transactions ct
JOIN profiles p ON ct.player_id = p.id
WHERE p.email = 'mathewbailey1990@gmail.com'
ORDER BY ct.created_at DESC;

-- 4. Check James Hope's credit
SELECT
  display_name,
  email,
  credit_balance
FROM profiles
WHERE email LIKE 'james%';

-- 5. Check James Hope's credit transactions
SELECT
  ct.amount,
  ct.type,
  ct.notes,
  ct.created_at,
  p.display_name
FROM credit_transactions ct
JOIN profiles p ON ct.player_id = p.id
WHERE p.email LIKE 'james%'
ORDER BY ct.created_at DESC;
