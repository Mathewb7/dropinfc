-- Migration: Remove Lottery System, Add FCFS Spot Tracking
-- Description: Replace weighted lottery with first-come, first-served registration
-- Date: 2026-01-16

-- =========================================
-- 1. Drop Lottery Function
-- =========================================

DROP FUNCTION IF EXISTS weighted_lottery_selection(UUID, INTEGER);

-- =========================================
-- 2. Create Spot Availability View
-- =========================================

CREATE OR REPLACE VIEW game_spots_available AS
SELECT
  g.id as game_id,
  g.status,
  16 as total_spots,
  COALESCE(
    COUNT(gp.id) FILTER (
      WHERE gp.status IN ('priority_confirmed', 'lottery_selected', 'confirmed')
      AND gp.payment_status IN ('pending', 'marked_paid', 'verified')
    ),
    0
  ) as filled_spots,
  (16 - COALESCE(
    COUNT(gp.id) FILTER (
      WHERE gp.status IN ('priority_confirmed', 'lottery_selected', 'confirmed')
      AND gp.payment_status IN ('pending', 'marked_paid', 'verified')
    ),
    0
  )) as available_spots,
  COALESCE(
    COUNT(gp.id) FILTER (WHERE gp.status = 'waitlist'),
    0
  ) as waitlist_count
FROM games g
LEFT JOIN game_players gp ON g.id = gp.game_id
GROUP BY g.id;

-- Grant permissions to authenticated users to view spot availability
GRANT SELECT ON game_spots_available TO authenticated;

-- =========================================
-- Notes
-- =========================================

-- This migration:
-- 1. Removes the weighted_lottery_selection() function (no longer needed)
-- 2. Creates a view to track available spots in real-time
-- 3. Keeps 'lottery_selected' status enum (repurposed to mean "FCFS joined")
-- 4. Keeps 'waitlist_open' game status (UI will call it "Spots Available")
-- 5. Keeps all other database structures intact for backward compatibility

-- FCFS Logic:
-- - When priority deadline passes (Thursday 12pm), game status becomes 'waitlist_open'
-- - Non-priority players can immediately join via "Join Game" button
-- - First INSERT to game_players table wins (database timestamp determines order)
-- - Status set to 'lottery_selected' (repurposed meaning)
-- - Game is full when available_spots = 0

-- Migration is reversible by:
-- 1. Dropping the game_spots_available view
-- 2. Recreating the weighted_lottery_selection function from previous migration
