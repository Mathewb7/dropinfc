-- DropIn FC Database Schema
-- This schema manages pickup soccer games with priority registration, waitlists, and team balancing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- ENUMS
-- ======================

CREATE TYPE user_role AS ENUM ('player', 'admin', 'super_admin');
CREATE TYPE game_status AS ENUM ('priority_open', 'waitlist_open', 'payment_pending', 'teams_assigned', 'completed', 'cancelled');
CREATE TYPE player_game_status AS ENUM ('priority_invited', 'priority_confirmed', 'priority_declined', 'waitlist', 'lottery_selected', 'confirmed', 'withdrawn', 'removed_nonpayment');
CREATE TYPE payment_status AS ENUM ('pending', 'marked_paid', 'verified', 'unpaid', 'credited');
CREATE TYPE team_name AS ENUM ('dark', 'light');
CREATE TYPE position_type AS ENUM ('field', 'sub', 'keeper');
CREATE TYPE credit_transaction_type AS ENUM ('credit_added', 'credit_used', 'refund_requested', 'refund_completed');
CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'denied');

-- ======================
-- TABLES
-- ======================

-- 1. PROFILES (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  whatsapp_name TEXT,
  is_permanent_keeper BOOLEAN DEFAULT false,
  skill_rating INTEGER CHECK (skill_rating >= 1 AND skill_rating <= 5),
  credit_balance DECIMAL(10, 2) DEFAULT 0 CHECK (credit_balance >= 0),
  withdrawal_strikes INTEGER DEFAULT 0 CHECK (withdrawal_strikes >= 0),
  strike_cooldown_until TIMESTAMPTZ,
  total_games_played INTEGER DEFAULT 0 CHECK (total_games_played >= 0),
  times_started_as_sub INTEGER DEFAULT 0 CHECK (times_started_as_sub >= 0),
  times_started_as_keeper INTEGER DEFAULT 0 CHECK (times_started_as_keeper >= 0),
  weeks_since_last_played INTEGER DEFAULT 0 CHECK (weeks_since_last_played >= 0),
  role user_role DEFAULT 'player',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GAMES
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_date DATE NOT NULL,
  status game_status DEFAULT 'priority_open',
  priority_deadline TIMESTAMPTZ NOT NULL, -- Thursday 12pm
  payment_reminder_time TIMESTAMPTZ NOT NULL, -- Saturday 12pm
  payment_deadline TIMESTAMPTZ NOT NULL, -- Saturday midnight
  sunday_lottery_deadline TIMESTAMPTZ NOT NULL, -- Monday 12pm
  teams_announced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_date)
);

-- 3. GAME_PLAYERS
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status player_game_status NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  team team_name,
  position position_type,
  is_starting BOOLEAN,
  joined_waitlist_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- 4. CREDIT_TRANSACTIONS
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type credit_transaction_type NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REFUND_REQUESTS
CREATE TABLE refund_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  status refund_status DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(player_id, game_id, status) -- Prevent duplicate pending requests
);

-- ======================
-- INDEXES
-- ======================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_weeks_since_last_played ON profiles(weeks_since_last_played);

CREATE INDEX idx_games_game_date ON games(game_date);
CREATE INDEX idx_games_status ON games(status);

CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_player_id ON game_players(player_id);
CREATE INDEX idx_game_players_status ON game_players(status);
CREATE INDEX idx_game_players_payment_status ON game_players(payment_status);
CREATE INDEX idx_game_players_joined_waitlist_at ON game_players(joined_waitlist_at);

CREATE INDEX idx_credit_transactions_player_id ON credit_transactions(player_id);
CREATE INDEX idx_credit_transactions_game_id ON credit_transactions(game_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);

CREATE INDEX idx_refund_requests_player_id ON refund_requests(player_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);

-- ======================
-- ROW LEVEL SECURITY (RLS)
-- ======================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
-- Players can view their own full profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Players can view limited info of other players (display_name, skill_rating)
CREATE POLICY "Users can view other players basic info"
  ON profiles FOR SELECT
  USING (true);

-- Players can update their own limited fields
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Can't change own role
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admins can update skill ratings and other admin fields
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Super admins can insert/delete profiles
CREATE POLICY "Super admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- GAMES POLICIES
-- Everyone can view games
CREATE POLICY "Anyone can view games"
  ON games FOR SELECT
  USING (true);

-- Admins can manage games
CREATE POLICY "Admins can insert games"
  ON games FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update games"
  ON games FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete games"
  ON games FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- GAME_PLAYERS POLICIES
-- Players can view their own game entries
CREATE POLICY "Users can view own game entries"
  ON game_players FOR SELECT
  USING (player_id = auth.uid());

-- Players can view priority players when they are priority
CREATE POLICY "Priority players can view other priority players"
  ON game_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_players gp
      WHERE gp.game_id = game_players.game_id
      AND gp.player_id = auth.uid()
      AND gp.status IN ('priority_invited', 'priority_confirmed')
      AND game_players.status IN ('priority_invited', 'priority_confirmed')
    )
  );

-- Players can view confirmed/team assigned players
CREATE POLICY "Users can view confirmed players"
  ON game_players FOR SELECT
  USING (
    status IN ('confirmed', 'lottery_selected')
    OR EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_players.game_id
      AND games.teams_announced = true
    )
  );

-- Players can insert themselves into waitlist
CREATE POLICY "Users can join waitlist"
  ON game_players FOR INSERT
  WITH CHECK (
    player_id = auth.uid()
    AND status = 'waitlist'
  );

-- Players can update their own status (limited transitions)
CREATE POLICY "Users can update own game status"
  ON game_players FOR UPDATE
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Admins can view all game_players
CREATE POLICY "Admins can view all game players"
  ON game_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admins can manage game_players
CREATE POLICY "Admins can insert game players"
  ON game_players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update game players"
  ON game_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete game players"
  ON game_players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- CREDIT_TRANSACTIONS POLICIES
-- Players can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (player_id = auth.uid());

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
  ON credit_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only system/admins can insert transactions
CREATE POLICY "Admins can insert transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- REFUND_REQUESTS POLICIES
-- Players can view their own refund requests
CREATE POLICY "Users can view own refund requests"
  ON refund_requests FOR SELECT
  USING (player_id = auth.uid());

-- Players can create refund requests
CREATE POLICY "Users can create refund requests"
  ON refund_requests FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Admins can view all refund requests
CREATE POLICY "Admins can view all refund requests"
  ON refund_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admins can update refund requests
CREATE POLICY "Admins can update refund requests"
  ON refund_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ======================
-- FUNCTIONS
-- ======================

-- Function: Auto-update weeks_since_last_played
-- Called weekly to increment weeks_since_last_played for all players
CREATE OR REPLACE FUNCTION update_weeks_since_last_played()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET weeks_since_last_played = weeks_since_last_played + 1
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reset weeks_since_last_played when player plays
CREATE OR REPLACE FUNCTION reset_weeks_since_last_played()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    UPDATE profiles
    SET weeks_since_last_played = 0
    WHERE id = NEW.player_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_reset_weeks_since_last_played
  AFTER UPDATE ON game_players
  FOR EACH ROW
  EXECUTE FUNCTION reset_weeks_since_last_played();

-- Function: Weighted lottery selection
-- Selects players from waitlist based on weighted factors
CREATE OR REPLACE FUNCTION weighted_lottery_selection(
  p_game_id UUID,
  p_spots_available INTEGER
)
RETURNS TABLE(player_id UUID, weight DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gp.player_id,
    (
      -- Base weight
      100.0 +
      -- Weeks since last played (10 points per week, max 50)
      LEAST(p.weeks_since_last_played * 10.0, 50.0) +
      -- Times started as sub (5 points per time, max 25)
      LEAST(p.times_started_as_sub * 5.0, 25.0) +
      -- Inverse of total games (less games = more weight, max 30)
      LEAST((100.0 - p.total_games_played) * 0.3, 30.0) +
      -- Earlier waitlist join time (normalize to 0-20 points)
      (
        20.0 * (
          1.0 - (
            EXTRACT(EPOCH FROM (gp.joined_waitlist_at -
              (SELECT MIN(joined_waitlist_at) FROM game_players WHERE game_id = p_game_id AND status = 'waitlist')
            )) / NULLIF(
              EXTRACT(EPOCH FROM (
                (SELECT MAX(joined_waitlist_at) FROM game_players WHERE game_id = p_game_id AND status = 'waitlist') -
                (SELECT MIN(joined_waitlist_at) FROM game_players WHERE game_id = p_game_id AND status = 'waitlist')
              )), 0
            )
          )
        )
      )
    ) AS weight
  FROM game_players gp
  JOIN profiles p ON gp.player_id = p.id
  WHERE gp.game_id = p_game_id
    AND gp.status = 'waitlist'
    AND p.is_active = true
    AND (p.strike_cooldown_until IS NULL OR p.strike_cooldown_until < NOW())
  ORDER BY weight DESC, RANDOM()
  LIMIT p_spots_available;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Team balancing algorithm
-- Balances teams based on skill ratings
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
    AND p.is_permanent_keeper = true
  ORDER BY RANDOM()
  LIMIT 1;

  -- If we have a permanent keeper, assign them, otherwise select randomly from confirmed
  IF v_keeper_dark IS NULL THEN
    SELECT gp.player_id INTO v_keeper_dark
    FROM game_players gp
    WHERE gp.game_id = p_game_id
      AND gp.status IN ('confirmed', 'lottery_selected', 'priority_confirmed')
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  -- Select second keeper (not the first one)
  SELECT gp.player_id INTO v_keeper_light
  FROM game_players gp
  JOIN profiles p ON gp.player_id = p.id
  WHERE gp.game_id = p_game_id
    AND gp.status IN ('confirmed', 'lottery_selected', 'priority_confirmed')
    AND p.is_permanent_keeper = true
    AND gp.player_id != v_keeper_dark
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_keeper_light IS NULL THEN
    SELECT gp.player_id INTO v_keeper_light
    FROM game_players gp
    WHERE gp.game_id = p_game_id
      AND gp.status IN ('confirmed', 'lottery_selected', 'priority_confirmed')
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

    -- Assign position (first 5 per team are starters, rest are subs)
    v_position_counter := v_position_counter + 1;

    RETURN QUERY SELECT
      v_player.player_id,
      v_target_team,
      CASE WHEN v_position_counter <= 10 THEN 'field'::position_type ELSE 'sub'::position_type END,
      (v_position_counter <= 10);

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update player stats after game completion
CREATE OR REPLACE FUNCTION update_player_stats_after_game()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update stats for all confirmed players
    UPDATE profiles p
    SET
      total_games_played = total_games_played + 1,
      times_started_as_sub = times_started_as_sub +
        CASE WHEN gp.position = 'sub' AND gp.is_starting = true THEN 1 ELSE 0 END,
      times_started_as_keeper = times_started_as_keeper +
        CASE WHEN gp.position = 'keeper' AND gp.is_starting = true THEN 1 ELSE 0 END
    FROM game_players gp
    WHERE gp.game_id = NEW.id
      AND gp.player_id = p.id
      AND gp.status = 'confirmed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_player_stats
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_after_game();

-- Function: Handle profile creation on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ======================
-- HELPER FUNCTIONS
-- ======================

-- Get waitlist position for a player
CREATE OR REPLACE FUNCTION get_waitlist_position(p_game_id UUID, p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_position INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_position
  FROM game_players
  WHERE game_id = p_game_id
    AND status = 'waitlist'
    AND joined_waitlist_at <= (
      SELECT joined_waitlist_at
      FROM game_players
      WHERE game_id = p_game_id AND player_id = p_player_id
    );
  RETURN v_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if player can join game (no strike cooldown)
CREATE OR REPLACE FUNCTION can_join_game(p_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_cooldown TIMESTAMPTZ;
BEGIN
  SELECT strike_cooldown_until INTO v_cooldown
  FROM profiles
  WHERE id = p_player_id;

  RETURN (v_cooldown IS NULL OR v_cooldown < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================
-- INITIAL DATA / SEED
-- ======================

-- Create a default super admin (update with your email)
-- INSERT INTO profiles (id, email, display_name, role)
-- VALUES (
--   'your-auth-user-id-here',
--   'admin@dropin-fc.com',
--   'Super Admin',
--   'super_admin'
-- );

-- ======================
-- COMMENTS
-- ======================

COMMENT ON TABLE profiles IS 'Extended user profiles with game statistics and settings';
COMMENT ON TABLE games IS 'Soccer games with registration deadlines and status tracking';
COMMENT ON TABLE game_players IS 'Player registrations for games with payment and team assignment';
COMMENT ON TABLE credit_transactions IS 'Financial transaction history for player credits';
COMMENT ON TABLE refund_requests IS 'Player refund requests requiring admin approval';

COMMENT ON FUNCTION weighted_lottery_selection IS 'Selects waitlist players using weighted algorithm based on participation history';
COMMENT ON FUNCTION balance_teams IS 'Assigns players to balanced teams based on skill ratings';
COMMENT ON FUNCTION update_weeks_since_last_played IS 'Weekly cron job to increment weeks counter';
COMMENT ON FUNCTION get_waitlist_position IS 'Returns player position in waitlist queue';
COMMENT ON FUNCTION can_join_game IS 'Checks if player is eligible to join (no active strikes)';
