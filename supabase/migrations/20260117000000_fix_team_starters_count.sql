-- Fix team balance to use 4 field starters + 3 subs per team (instead of 5+2)
-- Total per team: 1 keeper + 4 field + 3 subs = 8 players

CREATE OR REPLACE FUNCTION balance_teams(p_game_id UUID)
RETURNS TABLE(
  player_id UUID,
  assigned_team team_name,
  assigned_position position_type,
  is_starting BOOLEAN
) AS $$
DECLARE
  v_keeper_dark UUID;
  v_keeper_light UUID;
  v_field_players UUID[];
  v_dark_total INTEGER := 0;
  v_light_total INTEGER := 0;
  v_player RECORD;
  v_target_team team_name;
  v_position_counter INTEGER := 0;
BEGIN
  -- Select permanent keepers first
  SELECT gp.player_id INTO v_keeper_dark
  FROM game_players gp
  JOIN profiles p ON gp.player_id = p.id
  WHERE gp.game_id = p_game_id
    AND gp.status IN ('confirmed', 'lottery_selected', 'priority_confirmed')
    AND gp.payment_status IN ('verified', 'marked_paid')
    AND p.is_permanent_keeper = true
  ORDER BY RANDOM()
  LIMIT 1;

  -- If we have a permanent keeper, assign them, otherwise select randomly from confirmed
  IF v_keeper_dark IS NULL THEN
    SELECT gp.player_id INTO v_keeper_dark
    FROM game_players gp
    WHERE gp.game_id = p_game_id
      AND gp.status IN ('confirmed', 'lottery_selected', 'priority_confirmed')
      AND gp.payment_status IN ('verified', 'marked_paid')
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  -- Select second keeper (not the first one)
  SELECT gp.player_id INTO v_keeper_light
  FROM game_players gp
  JOIN profiles p ON gp.player_id = p.id
  WHERE gp.game_id = p_game_id
    AND gp.status IN ('confirmed', 'lottery_selected', 'priority_confirmed')
    AND gp.payment_status IN ('verified', 'marked_paid')
    AND p.is_permanent_keeper = true
    AND gp.player_id != v_keeper_dark
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_keeper_light IS NULL THEN
    SELECT gp.player_id INTO v_keeper_light
    FROM game_players gp
    WHERE gp.game_id = p_game_id
      AND gp.status IN ('confirmed', 'lottery_selected', 'priority_confirmed')
      AND gp.payment_status IN ('verified', 'marked_paid')
      AND gp.player_id != v_keeper_dark
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  -- Return keepers
  RETURN QUERY SELECT v_keeper_dark, 'dark'::team_name, 'keeper'::position_type, true;
  RETURN QUERY SELECT v_keeper_light, 'light'::team_name, 'keeper'::position_type, true;

  -- Get field players sorted by skill rating (descending)
  FOR v_player IN
    SELECT gp.player_id, COALESCE(p.skill_rating, 3) as skill
    FROM game_players gp
    JOIN profiles p ON gp.player_id = p.id
    WHERE gp.game_id = p_game_id
      AND gp.status IN ('confirmed', 'lottery_selected', 'priority_confirmed')
      AND gp.payment_status IN ('verified', 'marked_paid')
      AND gp.player_id NOT IN (v_keeper_dark, v_keeper_light)
    ORDER BY COALESCE(p.skill_rating, 3) DESC, RANDOM()
  LOOP
    -- Assign to team with lower total skill
    IF v_dark_total <= v_light_total THEN
      v_target_team := 'dark';
      v_dark_total := v_dark_total + v_player.skill;
    ELSE
      v_target_team := 'light';
      v_light_total := v_light_total + v_player.skill;
    END IF;

    -- Assign position (first 4 per team are starters, rest are subs)
    -- With 14 field players total, first 8 are starters (4 per team), last 6 are subs (3 per team)
    v_position_counter := v_position_counter + 1;

    RETURN QUERY SELECT
      v_player.player_id,
      v_target_team,
      'field'::position_type,
      (v_position_counter <= 8);

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION balance_teams IS 'Assigns players to balanced teams based on skill ratings (4 field starters + 3 subs per team)';
