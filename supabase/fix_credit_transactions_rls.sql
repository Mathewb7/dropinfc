-- Fix RLS policies for credit_transactions table
-- This allows players to read their own transactions

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Players can view own credit transactions" ON credit_transactions;

-- Create new policy to allow players to view their own transactions
CREATE POLICY "Players can view own credit transactions"
  ON credit_transactions
  FOR SELECT
  USING (auth.uid() = player_id);

-- Admins can view all transactions
DROP POLICY IF EXISTS "Admins can view all credit transactions" ON credit_transactions;

CREATE POLICY "Admins can view all credit transactions"
  ON credit_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Only admins can insert credit transactions
DROP POLICY IF EXISTS "Admins can insert credit transactions" ON credit_transactions;

CREATE POLICY "Admins can insert credit transactions"
  ON credit_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
