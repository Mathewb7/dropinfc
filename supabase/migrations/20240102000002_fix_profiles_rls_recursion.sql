-- Fix infinite recursion in profiles RLS policies
-- Multiple policies were querying profiles from within profiles policies

-- Drop all problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create security definer functions to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN v_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN v_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using security definer functions
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Super admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete profiles"
  ON profiles FOR DELETE
  USING (is_super_admin());

-- Users can update own profile (but can't change their role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = get_current_user_role() -- Can't change own role
  );

-- Add comments
COMMENT ON FUNCTION is_admin IS 'Security definer function to check if current user is admin or super_admin (avoids RLS recursion)';
COMMENT ON FUNCTION is_super_admin IS 'Security definer function to check if current user is super_admin (avoids RLS recursion)';
COMMENT ON FUNCTION get_current_user_role IS 'Security definer function to get current user role (avoids RLS recursion)';
