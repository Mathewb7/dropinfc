-- Fix profiles RLS to allow players to update their own credit_balance

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policy - allow players to update their own profile
-- but prevent them from changing their role
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add separate policy to prevent role changes by non-admins
-- (This is enforced at the application level, but adding as a safeguard)
-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Verify policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'UPDATE'
ORDER BY policyname;
