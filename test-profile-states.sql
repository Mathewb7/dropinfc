-- Test Profile Page States for Test Player 1
-- player01@dropin.test (ID: 29633e4e-acc8-4414-8385-094176e35a42)

-- ========================================
-- STATE 1: Clean slate (CURRENT STATE)
-- Credit Balance = 0, No Transactions
-- Expected: Only Profile Information card shows
-- ========================================
-- (Already in this state, just login to http://localhost:3000/profile)


-- ========================================
-- STATE 2: Has Credit Balance
-- Credit Balance = $25.00, No Transactions
-- Expected: Profile Info + Credit Balance card (with withdrawal button)
-- ========================================
UPDATE profiles
SET credit_balance = 25.00
WHERE email = 'player01@dropin.test';


-- ========================================
-- STATE 3: Has Transactions Only
-- Credit Balance = 0, Has Transaction History
-- Expected: Profile Info + Transaction History card
-- ========================================
-- First reset balance to 0
UPDATE profiles
SET credit_balance = 0.00
WHERE email = 'player01@dropin.test';

-- Add a transaction
INSERT INTO credit_transactions (player_id, game_id, amount, type, notes)
VALUES (
  '29633e4e-acc8-4414-8385-094176e35a42',
  NULL,
  15.00,
  'credit_added',
  'Refund for cancelled game'
);


-- ========================================
-- STATE 4: Has Both Credit and Transactions
-- Credit Balance = $15.00, Has Multiple Transactions
-- Expected: Profile Info + Credit Balance card + Transaction History card
-- ========================================
-- Set balance
UPDATE profiles
SET credit_balance = 15.00
WHERE email = 'player01@dropin.test';

-- Add multiple transactions
INSERT INTO credit_transactions (player_id, game_id, amount, type, notes)
VALUES
  ('29633e4e-acc8-4414-8385-094176e35a42', NULL, 30.00, 'credit_added', 'Refund from 2 cancelled games'),
  ('29633e4e-acc8-4414-8385-094176e35a42', NULL, -15.00, 'credit_used', 'Applied to game payment on Jan 10');


-- ========================================
-- RESET: Back to clean state
-- Credit Balance = 0, No Transactions
-- ========================================
UPDATE profiles
SET credit_balance = 0.00
WHERE email = 'player01@dropin.test';

DELETE FROM credit_transactions
WHERE player_id = '29633e4e-acc8-4414-8385-094176e35a42';
