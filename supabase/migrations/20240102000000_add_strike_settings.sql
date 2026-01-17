-- Add strike_settings table to store configurable strike system parameters
CREATE TABLE strike_settings (
  id SERIAL PRIMARY KEY,
  strikes_before_cooldown INTEGER NOT NULL CHECK (strikes_before_cooldown >= 1 AND strikes_before_cooldown <= 10),
  cooldown_weeks INTEGER NOT NULL CHECK (cooldown_weeks >= 1 AND cooldown_weeks <= 52),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE strike_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view strike settings
CREATE POLICY "Anyone can view strike settings"
  ON strike_settings FOR SELECT
  USING (true);

-- Only admins can update strike settings
CREATE POLICY "Admins can update strike settings"
  ON strike_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only admins can insert strike settings
CREATE POLICY "Admins can insert strike settings"
  ON strike_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Insert default settings (3 strikes, 3 weeks cooldown)
INSERT INTO strike_settings (strikes_before_cooldown, cooldown_weeks)
VALUES (3, 3);

-- Add index
CREATE INDEX idx_strike_settings_updated_at ON strike_settings(updated_at);

-- Comment
COMMENT ON TABLE strike_settings IS 'Configurable strike system parameters';
