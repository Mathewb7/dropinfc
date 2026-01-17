-- Fix credit_transactions RLS to allow players to create withdrawal credits

-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can insert transactions" ON credit_transactions;

-- Create new policy allowing players to insert their own withdrawal credits
CREATE POLICY "Players can create withdrawal credits"
  ON credit_transactions FOR INSERT
  WITH CHECK (
    -- Players can only insert withdrawal credits for themselves
    (player_id = auth.uid() AND type = 'withdrawal_credit')
    OR
    -- Admins can insert any type of transaction
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Verify policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'credit_transactions'
ORDER BY policyname;
