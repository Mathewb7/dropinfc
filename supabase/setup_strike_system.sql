-- Strike System Setup - Simplified with Only Non-Payment Trigger
-- Run this SQL in Supabase to set up the configurable strike system

-- 1. Create strike settings table
CREATE TABLE IF NOT EXISTS strike_settings (
  id SERIAL PRIMARY KEY,
  strikes_before_cooldown INTEGER NOT NULL DEFAULT 3,
  cooldown_weeks INTEGER NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Insert default settings
INSERT INTO strike_settings (strikes_before_cooldown, cooldown_weeks)
VALUES (3, 3)
ON CONFLICT DO NOTHING;

-- 2. Create function to apply strike when player is removed for non-payment
CREATE OR REPLACE FUNCTION apply_nonpayment_strike()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
BEGIN
  -- Only apply strike if player is being deleted/removed from game
  -- This happens when admin removes them for non-payment
  IF OLD IS NOT NULL AND OLD.payment_status IN ('pending', 'marked_paid') THEN
    -- Get current strike settings
    SELECT * INTO v_settings
    FROM strike_settings
    ORDER BY id DESC
    LIMIT 1;

    -- Increment strike count
    UPDATE profiles
    SET withdrawal_strikes = withdrawal_strikes + 1
    WHERE id = OLD.player_id;

    -- Check if this triggers cooldown (using current settings)
    UPDATE profiles
    SET strike_cooldown_until = NOW() + (v_settings.cooldown_weeks || ' weeks')::INTERVAL
    WHERE id = OLD.player_id
      AND withdrawal_strikes >= v_settings.strikes_before_cooldown
      AND (strike_cooldown_until IS NULL OR strike_cooldown_until < NOW());

    RAISE NOTICE 'Non-payment strike applied to player %. Total strikes: %', OLD.player_id, (SELECT withdrawal_strikes FROM profiles WHERE id = OLD.player_id);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger on game_players table for non-payment removals
DROP TRIGGER IF EXISTS trigger_apply_nonpayment_strike ON game_players;

CREATE TRIGGER trigger_apply_nonpayment_strike
BEFORE DELETE ON game_players
FOR EACH ROW
EXECUTE FUNCTION apply_nonpayment_strike();

-- 4. Update can_join_game function to check cooldown status
CREATE OR REPLACE FUNCTION can_join_game(p_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_cooldown_until TIMESTAMPTZ;
BEGIN
  -- Get player's cooldown status
  SELECT strike_cooldown_until INTO v_cooldown_until
  FROM profiles
  WHERE id = p_player_id;

  -- Player can join if not in cooldown or cooldown has expired
  RETURN (v_cooldown_until IS NULL OR v_cooldown_until < NOW());
END;
$$ LANGUAGE plpgsql;

-- 5. Set up RLS policies for strike_settings table
ALTER TABLE strike_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view strike settings
DROP POLICY IF EXISTS "Admins can view strike settings" ON strike_settings;
CREATE POLICY "Admins can view strike settings"
  ON strike_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admins can update strike settings
DROP POLICY IF EXISTS "Admins can update strike settings" ON strike_settings;
CREATE POLICY "Admins can update strike settings"
  ON strike_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

COMMENT ON TABLE strike_settings IS 'Configurable settings for withdrawal strike system';
COMMENT ON FUNCTION apply_nonpayment_strike() IS 'Automatically applies strikes when players are removed for non-payment';
COMMENT ON FUNCTION can_join_game IS 'Checks if player can join games (not in active cooldown)';
