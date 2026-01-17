# DropIn FC Database Schema

This directory contains the complete database schema for the DropIn FC application.

## Schema Overview

### Tables

1. **profiles** - Extended user profiles with game statistics
2. **games** - Game sessions with deadlines and status tracking
3. **game_players** - Player registrations and team assignments
4. **credit_transactions** - Financial transaction history
5. **refund_requests** - Player refund requests

### Key Features

- **Row Level Security (RLS)** - Comprehensive security policies for data access
- **Weighted Lottery System** - Fair selection algorithm based on participation history
- **Team Balancing** - Automatic team assignment based on skill ratings
- **Auto-updating Stats** - Triggers to maintain player statistics
- **Strike System** - Withdrawal penalties with cooldown periods

## Setup Instructions

### 1. Apply Schema to Supabase

You can apply this schema in two ways:

#### Option A: Supabase Dashboard (SQL Editor)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `schema.sql`
5. Run the query

#### Option B: Supabase CLI
```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### 2. Create Super Admin

After running the schema, create your first super admin by running this SQL in the Supabase SQL Editor:

```sql
-- First, sign up a user through your app or Supabase Auth
-- Then update their profile to super_admin role

UPDATE profiles
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

### 3. Configure Supabase Auth

Make sure these settings are enabled in your Supabase Auth settings:

- **Enable Email Confirmations** (optional based on your needs)
- **Email Templates** - Customize signup, password reset templates
- **Site URL** - Set to `http://localhost:3000` for development

## Database Functions

### Lottery Selection
```sql
-- Run lottery to select players from waitlist
SELECT * FROM weighted_lottery_selection(
  'game-uuid-here',  -- game_id
  5                  -- number of spots available
);
```

### Team Balancing
```sql
-- Balance teams for a game
SELECT * FROM balance_teams('game-uuid-here');
```

### Weekly Maintenance
```sql
-- Run this weekly (set up as a cron job or scheduled function)
SELECT update_weeks_since_last_played();
```

### Helper Functions
```sql
-- Get waitlist position
SELECT get_waitlist_position('game-uuid', 'player-uuid');

-- Check if player can join
SELECT can_join_game('player-uuid');
```

## Row Level Security

The schema implements comprehensive RLS policies:

- **Players** can view their own data and limited public data
- **Admins** can manage games, ratings, and view all data
- **Super Admins** have full access to all operations

### Policy Summary

**Profiles:**
- Users see their full profile + basic info of others
- Admins can update skill ratings
- Super admins have full control

**Games:**
- Everyone can view games
- Admins can create/update/delete games

**Game Players:**
- Players see their own registrations
- Priority players can see other priority players
- Waitlist players only see waitlist count (not other players)
- Admins see everything

## Game Registration Flow

1. **Priority Invitation** (Before Thursday 12pm)
   - Admins invite players with `priority_invited` status
   - Players confirm or decline

2. **Waitlist Opens** (After Thursday 12pm)
   - Players join waitlist
   - System tracks `joined_waitlist_at` timestamp

3. **Payment Period** (Saturday 12pm - midnight)
   - Reminder sent at Saturday 12pm
   - Deadline at Saturday midnight
   - Non-payers removed, spots go to lottery

4. **Sunday Lottery** (Before Monday 12pm)
   - Weighted lottery selects from waitlist
   - Selected players notified

5. **Team Assignment**
   - Admin runs team balancing
   - Teams announced to players

6. **Game Completion**
   - Stats automatically updated
   - Credits processed

## Credit System

### Transaction Types
- `credit_added` - Manual credit added by admin
- `credit_used` - Credit applied to game payment
- `refund_requested` - Player requests refund (creates refund_request)
- `refund_completed` - Refund approved and processed

### Refund Flow
1. Player creates refund request
2. Admin reviews and approves/denies
3. If approved, credit transaction created
4. Player balance updated

## Strike System

### Rules
- Player gets strike for late withdrawal
- After 3 strikes: cooldown period applied
- During cooldown: cannot join games
- Cooldown typically lasts 2-4 weeks

### Implementation
```sql
-- Add strike
UPDATE profiles
SET withdrawal_strikes = withdrawal_strikes + 1,
    strike_cooldown_until = CASE
      WHEN withdrawal_strikes + 1 >= 3
      THEN NOW() + INTERVAL '2 weeks'
      ELSE strike_cooldown_until
    END
WHERE id = 'player-uuid';
```

## Indexes

Indexes are created for:
- Lookup by role, status, dates
- Join performance on foreign keys
- Waitlist ordering
- Transaction history queries

## Maintenance Tasks

### Weekly
```sql
-- Increment weeks_since_last_played
SELECT update_weeks_since_last_played();
```

### After Each Game
- Mark game as `completed`
- Trigger automatically updates player stats

### Monthly
- Review refund requests
- Clean up old games (optional)

## Security Notes

1. **Never disable RLS** on production tables
2. **Validate user roles** before admin operations
3. **Use SECURITY DEFINER** carefully in functions
4. **Audit logs** - Consider adding audit table for sensitive operations
5. **Backup regularly** - Enable Supabase automatic backups

## Troubleshooting

### RLS Blocking Queries
If queries are blocked unexpectedly, check:
1. User is authenticated: `SELECT auth.uid();`
2. User has correct role: `SELECT role FROM profiles WHERE id = auth.uid();`
3. Policy conditions are met

### Performance Issues
If queries are slow:
1. Check indexes are being used: `EXPLAIN ANALYZE your_query;`
2. Add indexes for frequently filtered columns
3. Consider materialized views for complex aggregations

## Next Steps

After setting up the database:

1. Create TypeScript types from this schema
2. Build API functions for common operations
3. Set up scheduled functions for weekly tasks
4. Configure email templates in Supabase
5. Test RLS policies thoroughly

## Support

For questions about the schema, refer to:
- Supabase Documentation: https://supabase.com/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/
