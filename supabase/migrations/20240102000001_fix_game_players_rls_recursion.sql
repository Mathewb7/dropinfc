-- Fix infinite recursion in game_players RLS policy
-- The "Priority players can view other priority players" policy was causing recursion
-- by querying game_players from within a game_players policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Priority players can view other priority players" ON game_players;

-- Create a security definer function to check if user is priority player
CREATE OR REPLACE FUNCTION is_priority_player_for_game(p_game_id UUID, p_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_priority BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = p_game_id
      AND player_id = p_player_id
      AND status IN ('priority_invited', 'priority_confirmed')
  ) INTO v_is_priority;

  RETURN v_is_priority;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the policy using the security definer function
CREATE POLICY "Priority players can view other priority players"
  ON game_players FOR SELECT
  USING (
    -- User can see other priority players if they are also a priority player in the same game
    status IN ('priority_invited', 'priority_confirmed')
    AND is_priority_player_for_game(game_id, auth.uid())
  );

COMMENT ON FUNCTION is_priority_player_for_game IS 'Security definer function to check if user is a priority player for a game (avoids RLS recursion)';
