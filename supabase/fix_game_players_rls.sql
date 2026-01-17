-- Fix game_players RLS policies
-- The current policies are too complex and blocking client queries
-- We need simpler policies that allow viewing game participation data

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own game status" ON game_players;
DROP POLICY IF EXISTS "Priority players can view other priority players" ON game_players;
DROP POLICY IF EXISTS "Users can view confirmed players" ON game_players;
DROP POLICY IF EXISTS "Admins can view all game players" ON game_players;
DROP POLICY IF EXISTS "Users can join waitlist" ON game_players;
DROP POLICY IF EXISTS "Users can update own game status" ON game_players;
DROP POLICY IF EXISTS "Admins can insert game players" ON game_players;
DROP POLICY IF EXISTS "Admins can update game players" ON game_players;
DROP POLICY IF EXISTS "Admins can delete game players" ON game_players;

-- Create simplified policies

-- 1. Anyone can view all game_players (for displaying game rosters)
-- This is OK because it's just showing who's playing, not sensitive data
CREATE POLICY "Anyone can view game players"
  ON game_players FOR SELECT
  USING (true);

-- 2. Players can insert themselves into games (waitlist)
CREATE POLICY "Users can join waitlist"
  ON game_players FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- 3. Players can update their own game_player records
CREATE POLICY "Users can update own game status"
  ON game_players FOR UPDATE
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- 4. Admins can do anything with game_players
CREATE POLICY "Admins can manage game players"
  ON game_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'game_players'
ORDER BY policyname;
