-- Fix infinite recursion in RLS policies
-- Drop the problematic policies and recreate them correctly

-- Drop old policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert/delete profiles" ON profiles;

-- Recreate without recursion using JWT claims
-- Admin policies: Check role from JWT metadata instead of querying profiles table
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    (SELECT auth.jwt()->>'role' = 'authenticated')
    AND
    (
      auth.uid() = id  -- Users can always see their own profile
      OR
      -- Check if user is admin via a security definer function (no recursion)
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
        LIMIT 1
      )
    )
  );

-- Better: Use a security definer function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER  -- Runs with elevated privileges, bypasses RLS
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Drop and recreate policies using the function
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Now use the function (no recursion!)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id  -- Own profile
    OR 
    is_admin()  -- Or is an admin (no recursion via security definer)
  );

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Super admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      LIMIT 1
    )
  );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

SELECT 'RLS policies fixed!' as status;
