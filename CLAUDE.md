# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DropIn FC** is a Next.js 16 + Supabase application for managing pickup soccer games with priority registration, waitlist lottery, payment tracking, automated team balancing, and player statistics.

**Tech Stack:**
- Next.js 16.1.1 (App Router, React 19, Turbopack)
- Supabase (PostgreSQL with RLS, Auth, Realtime)
- TypeScript with path alias `@/`
- Radix UI + Tailwind CSS 4 + shadcn/ui
- html-to-image for lineup exports

---

## Common Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:3000

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
```

**Environment Setup:**
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Testing Environment

**Two Environments:**
- **Production:** Cloud Supabase (`https://lqushgfncphmnjiwtwlx.supabase.co`) - Real users & data
- **Test:** Local Docker (`http://127.0.0.1:54321`) - 45 test players, safe to break

**⚠️ ALWAYS Check Before Running Commands:**
```bash
npm run check-env          # Shows which environment you're connected to
```

**Switch Environments:** Change `.env.local` and restart dev server
```bash
# Test Mode (local)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...demo...

# Production Mode (cloud)
NEXT_PUBLIC_SUPABASE_URL=https://lqushgfncphmnjiwtwlx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_90-z66cu...
```

**Test Commands:**
```bash
npx supabase start         # Start local test database
npm run test               # Run unit + integration tests (83 passing)
npm run test:e2e           # Run E2E tests (Playwright)
npx supabase db reset      # Reset test data to seed state
npx supabase stop          # Stop local database
```

**Test Users:** `admin@dropin.test`, `player1@dropin.test` ... `player43@dropin.test` (password: `testpass123`)

**Safety Rules:**
1. **NEVER** run SQL migrations directly on production without backup
2. **NEVER** run `supabase db reset` while `.env.local` points to production
3. **ALWAYS** run `npm run check-env` before destructive operations
4. **NEVER** commit `.env.local` with production keys to git
5. Test users (`@dropin.test` emails) should ONLY exist in test database

**Cleaning Production:** If test users leaked into production, use `/supabase/cleanup_test_users_from_production.sql` (review carefully before running)

---

## Architecture

### Authentication & Authorization

**Multi-layer auth pattern:**

1. **Middleware (`/middleware.ts`)** - Runs on every request
   - Creates server Supabase client with cookie handling
   - Protects routes: `/dashboard`, `/profile`, `/admin` require auth
   - Admin routes check `profiles.role` for 'admin' or 'super_admin'
   - Redirects unauthorized to `/login`

2. **Client Context (`/src/contexts/AuthContext.tsx`)** - Global state
   - Wraps app in root layout as `<AuthProvider>`
   - Provides: `user`, `session`, `profile` (from DB), loading state
   - Methods: `signUp`, `signIn`, `signOut`, `refreshProfile`
   - Auto-fetches profile from `profiles` table on login

3. **Hooks**
   - `useAuth()` - Access auth context anywhere
   - `useRequireAuth()` - SSR-safe auth check for pages

**Key Pattern:** Always use `useAuth()` to access current user/profile. Profile contains role, skill_rating, stats, credits. RLS policies enforce data access at DB layer.

### Database Architecture

**Critical Pattern:** Use **separate Supabase clients**:
- `/lib/supabase/client.ts` for browser (singleton)
- `/lib/supabase/server.ts` for API routes & SSR (per-request)

**5 Core Tables:**

1. **profiles** - Extended user data (foreign key to auth.users)
   - Fields: display_name, whatsapp_name, skill_rating (1-5), is_permanent_keeper, role
   - Stats: total_games_played, times_started_as_sub, times_started_as_keeper, weeks_since_last_played
   - Finance: credit_balance, withdrawal_strikes, strike_cooldown_until

2. **games** - Soccer sessions
   - Status flow: priority_open → waitlist_open → payment_pending → teams_assigned → completed
   - Deadlines: priority_deadline (Thu 12pm), payment_deadline (Sat 11:59pm), lottery_deadline (Mon 12pm)
   - Flag: teams_announced

3. **game_players** - Registration records (links games ↔ profiles)
   - Status: priority_invited, priority_confirmed, waitlist, lottery_selected, confirmed, withdrawn, removed_nonpayment
   - Payment: pending, marked_paid, verified, unpaid, credited
   - Team assignment: team (dark|light), position (field|sub|keeper), is_starting

4. **credit_transactions** - Payment/refund history
   - Types: credit_added, credit_used, refund_requested, refund_completed

5. **refund_requests** - Admin approval workflow
   - Status: pending, approved, denied

**Database Functions (call via `.rpc()`):**

- `weighted_lottery_selection(game_id, spots_available)` - Fair lottery based on:
  - Weeks since last played (max 50 points)
  - Times started as sub (max 25 points)
  - Total games played (max 30 points)
  - Waitlist join timestamp (max 20 points)

- `balance_teams(game_id)` - Auto-balances teams by:
  - Selecting 2 keepers (prioritizes permanent keepers)
  - Drafting field players by skill rating (descending)
  - Balancing total skill between dark/light teams
  - Designating first 5 per team as starters

- `get_waitlist_position(game_id, player_id)` - Returns queue position

- `can_join_game(player_id)` - Checks strike cooldown eligibility

**Auto-Triggers:**
- `handle_new_user()` - Creates profile when auth.users inserted
- `update_player_stats_after_game()` - Updates profile stats when game marked completed

**RLS Policies:**
- Players: See own profile fully + basic info of others; limited game visibility
- Admins: Full read; can manage games, ratings, refunds
- Super Admins: Full CRUD on all tables

**Types:** `/src/types/database.ts` contains full schema types auto-generated from Supabase.

### Real-time Data Patterns

**useGame() Hook** (`/src/hooks/useGame.ts`):
- Fetches current/upcoming game + all game_players with profiles
- Subscribes to postgres_changes on `games` and `game_players` tables
- Auto-refetches when any change detected
- Unsubscribes on unmount
- Used by: dashboard (player), admin pages

**Pattern for other real-time needs:**
```typescript
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'your_table' }, () => {
    // refetch data
  })
  .subscribe()

// Cleanup
return () => { channel.unsubscribe() }
```

### Game Registration Workflow

**Time-Based State Machine:**

1. **PRIORITY_OPEN** (Wed AM - Thu 12pm)
   - Admins invite priority players (create game_players with status 'priority_invited')
   - Players confirm/decline via dashboard
   - Status changes to 'priority_confirmed' or 'priority_declined'

2. **WAITLIST_OPEN** (Thu 12pm - Sat 12pm)
   - General waitlist opens for all players
   - System tracks `joined_waitlist_at` timestamp
   - Players can join/leave waitlist

3. **PAYMENT_PENDING** (Sat 12pm - Sat 11:59pm)
   - Reminder sent
   - Players mark payment or credits auto-applied
   - Non-payers auto-removed (status → 'removed_nonpayment')

4. **LOTTERY** (Mon 12pm)
   - Admin runs `weighted_lottery_selection()` RPC
   - Selected waitlist players → status 'lottery_selected'

5. **TEAMS_ASSIGNED**
   - Admin runs `balance_teams()` RPC
   - Sets team (dark/light), position (field/sub/keeper), is_starting
   - Sets `game.teams_announced = true`
   - Players see teammates

6. **COMPLETED**
   - Admin marks game completed
   - Trigger auto-updates profile stats

**Strike System:**
- 3 strikes = cooldown period (typically 2-4 weeks)
- Triggers: Late withdrawal (<24hrs), non-payment by deadline
- Admin sets `strike_cooldown_until` in profile
- `can_join_game()` RPC checks eligibility

**Credit System:**
- Earned via refunds → `credit_balance`
- Auto-applied to next game payment
- Withdrawal requests via Profile page → admin approval workflow

### Component Patterns

**UI Components** (`/src/components/ui/`):
- Radix UI primitives wrapped with Tailwind classes
- 13+ components: Button, Card, Badge, Alert, Dialog, Select, etc.
- Import from `@/components/ui/component-name`

**Page Pattern:**
```typescript
'use client' // Most pages are client-side interactive

import { useAuth } from '@/contexts/AuthContext'
import { useGame } from '@/hooks/useGame'

export default function Page() {
  const { user, profile } = useAuth()
  const { game, players, loading, error, refetch } = useGame()

  if (loading) return <Loader2 />
  if (error) return <Alert variant="destructive">{error}</Alert>

  // Component logic
}
```

**Admin Pattern:**
```typescript
const { profile } = useAuth()

if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
  return <Alert>Unauthorized</Alert>
}

// Admin features
```

**Constants** (`/src/lib/constants.ts`):
- `GAME_CONFIG` - Location, day, time, total players, payment amount
- `DEADLINES` - Priority window, payment, lottery timing
- `STRIKE_SYSTEM` - Cooldown rules
- `LOTTERY_WEIGHTS` - Points allocation
- `TEAM_COLORS` - Dark/Light team styling

### Navigation Structure

**User Pages:**
- `/` - Home (welcome, login/signup links)
- `/dashboard` - Game status, actions, team view
- `/profile` - Settings, stats, credits, transactions

**Admin Pages** (sidebar nav in `/src/components/admin/AdminNav.tsx`):
- `/admin` - Game dashboard with team balancing & lineup generation
- `/admin/players` - Manage all players, skill ratings, roles
- `/admin/payments` - Verify payments, track status
- `/admin/lottery` - Run weighted lottery
- `/admin/lineup` - View/download team lineups
- `/admin/messages` - Send messages (placeholder)
- `/admin/refunds` - Approve/deny refund requests
- `/admin/strikes` - Manage withdrawal strikes
- `/admin/admins` - Manage admin roles (super admin only)

**Role Hierarchy:**
- `player` - Basic access, own data only
- `admin` - Manage games, ratings, refunds, see all data
- `super_admin` - Everything + manage admins

---

## File Organization

```
/src
├── /app                      # Next.js pages
│   ├── /(public)            # Login, signup (no auth required)
│   ├── /dashboard           # Player dashboard
│   ├── /profile             # Player profile management
│   └── /admin               # Admin panel with sub-routes
├── /components
│   ├── /admin               # Admin-only components
│   ├── /game                # Game-related components
│   ├── /layout              # Layout components (Header)
│   └── /ui                  # Radix UI primitives (shadcn/ui)
├── /contexts
│   └── AuthContext.tsx      # Global auth state
├── /hooks                   # Custom React hooks
├── /lib
│   ├── /supabase
│   │   ├── client.ts        # Browser client
│   │   └── server.ts        # Server client (SSR/API)
│   ├── constants.ts         # Game config, deadlines
│   └── utils.ts             # Helper functions
└── /types
    └── database.ts          # Supabase schema types

/supabase
├── schema.sql               # Complete DB schema
└── *.sql                    # Migrations & setup scripts

/middleware.ts              # Auth routing & role checks
```

**Path Alias:** `@/` maps to `/src/` (configured in `tsconfig.json`)

---

## Development Workflow

### Adding a New Admin Feature

1. Create page in `/src/app/admin/feature-name/page.tsx` with `'use client'`
2. Use `useAuth()` to check admin role
3. Query Supabase directly in component or create custom hook
4. RLS policies auto-enforce security (no extra guards needed)
5. Add nav link in `/src/components/admin/AdminNav.tsx`

### Adding a User-Facing Feature

1. Create page in `/src/app/feature-name/page.tsx`
2. Use `useRequireAuth()` to ensure user is logged in
3. Access current user via `useAuth()`
4. Query Supabase with RLS auto-enforcing data access
5. Add link to Header component if needed

### Database Schema Changes

1. Write migration in `/supabase/*.sql`
2. Test in Supabase SQL Editor
3. Update `/src/types/database.ts` with new types
4. Rebuild application

### Styling

- Use Tailwind utility classes
- Leverage existing `/components/ui/*` components
- Follow Radix UI patterns for complex interactions
- Global styles in `/src/app/globals.css`

---

## Critical Patterns to Follow

### 1. Always Query Fresh Data After Mutations

```typescript
const handleUpdate = async () => {
  const { error } = await supabase.from('table').update(data)
  if (!error) {
    refetch() // Trigger useGame refetch
    // or
    await refreshProfile() // Refresh auth profile
  }
}
```

### 2. Handle Loading & Error States

```typescript
if (loading) return <Loader2 className="animate-spin" />
if (error) return <Alert variant="destructive">{error}</Alert>
if (!game) return <Card><p>No upcoming game</p></Card>
```

### 3. Use RLS for Security

Never check permissions in frontend code. RLS policies at DB layer enforce all access control. Frontend code only needs to check role for UI display decisions.

### 4. Supabase Client Selection

- **Browser:** Use `/lib/supabase/client.ts` (singleton)
- **Server/Middleware:** Use `/lib/supabase/server.ts` (per-request with cookies)

### 5. Real-time Subscriptions

Always unsubscribe in useEffect cleanup:
```typescript
useEffect(() => {
  const channel = supabase.channel('changes').subscribe()
  return () => { channel.unsubscribe() }
}, [])
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `/middleware.ts` | Auth routing, role checking |
| `/src/contexts/AuthContext.tsx` | Global auth state & profile |
| `/src/hooks/useGame.ts` | Fetch game + players with real-time updates |
| `/src/hooks/useProfile.ts` | Fetch/update player profile |
| `/src/lib/supabase/client.ts` | Browser Supabase instance |
| `/src/lib/supabase/server.ts` | Server Supabase with cookies |
| `/src/types/database.ts` | TypeScript schema types |
| `/src/lib/constants.ts` | Game config, deadlines, weights |
| `/src/components/admin/AdminNav.tsx` | Admin sidebar navigation |
| `/src/app/admin/page.tsx` | Unified admin dashboard (game management + team balancing) |
| `/supabase/schema.sql` | Complete DB schema with functions & RLS |

---

## Troubleshooting

**Port 3000 in use:**
```bash
pkill -f "next dev"
npm run dev
```

**TypeScript errors with Supabase:**
- Common: "Argument of type '...' is not assignable to parameter of type 'never'"
- Usually type inference issues, doesn't prevent runtime
- Can safely ignore if query works in practice
- Fix: Add explicit type annotations to query builders

**Middleware redirect loops:**
- Check that public routes (/, /login, /signup) are excluded from middleware matcher
- Verify `auth.getUser()` not `auth.getSession()` is used (more secure)

**RLS policy issues:**
- Test queries directly in Supabase SQL Editor with specific user context
- Enable RLS: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- Check policy definitions match expected roles

**Real-time not updating:**
- Verify `game` table has Realtime enabled in Supabase
- Check subscription is active: look for "SUBSCRIBED" in console
- Ensure cleanup function unsubscribes on component unmount
