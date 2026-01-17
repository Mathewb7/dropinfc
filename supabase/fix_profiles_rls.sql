-- Fix infinite recursion in profiles RLS policies
-- The issue is that admin policies are checking the profiles table,
-- which triggers the same policy check, causing infinite recursion.

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view other players basic info" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create simple, non-recursive policies

-- 1. Users can view their own profile (no recursion)
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Users can view basic info of other players (no recursion)
CREATE POLICY "Users can view other players basic info"
  ON profiles
  FOR SELECT
  USING (true); -- Everyone can see everyone's basic info

-- 3. Users can update their own profile (no recursion)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Note: Admin policies removed to prevent recursion
-- Admins will use service role key for admin operations
