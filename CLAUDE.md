# CLAUDE.md

## Project Overview

**DropIn FC** - Next.js 16 + Supabase app for managing pickup soccer games with priority registration, waitlist lottery, payment tracking, team balancing, and player stats.

**Stack:** Next.js 16.1.1 (App Router, React 19) | Supabase (PostgreSQL, RLS, Auth, Realtime, Storage) | TypeScript (`@/` alias) | Tailwind CSS 4 + shadcn/ui

---

## Commands

```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
npm run lint             # ESLint
npm run test             # Unit + integration tests (Vitest)
npm run test:e2e         # E2E tests (Playwright) - requires dev server running
npm run check-env        # Show which Supabase environment is connected
```

**Local Test Database:**
```bash
npx supabase start       # Start local Supabase (Docker)
npm run test:db:seed     # Seed 50 test players
npx supabase stop        # Stop local Supabase
```

**Test Users:** `admin@dropin.test`, `player1@dropin.test` ... `player43@dropin.test` (password: `testpass123`)

---

## Architecture

### Auth Pattern
- **Middleware** (`/middleware.ts`) - Protects `/dashboard`, `/profile`, `/admin` routes
- **AuthContext** (`/src/contexts/AuthContext.tsx`) - Provides `user`, `profile`, `signIn`, `signOut`, `refreshProfile`
- **Hooks:** `useAuth()` for context, `useRequireAuth()` for SSR-safe checks

### Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User data (display_name, skill_rating 1-5, role, stats, credits, strikes) |
| `games` | Game sessions with status flow and deadlines |
| `game_players` | Registration records linking games ↔ profiles (status, payment, team) |
| `credit_transactions` | Payment/refund history |
| `refund_requests` | Admin approval workflow |
| `strike_settings` | Configurable strike system (strikes_before_cooldown, cooldown_weeks) |

**Game Status Flow:** `priority_open` → `waitlist_open` → `payment_pending` → `teams_assigned` → `completed`

**Key RPC Functions:**
- `weighted_lottery_selection(game_id, spots)` - Fair lottery based on weeks since played, sub count, games played
- `balance_teams(game_id)` - Auto-balance teams by skill rating
- `can_join_game(player_id)` - Check strike cooldown eligibility

### Supabase Clients
- **Browser:** `/src/lib/supabase/client.ts` (singleton)
- **Server:** `/src/lib/supabase/server.ts` (per-request with cookies)

### Real-time
`useGame()` hook subscribes to `games` and `game_players` changes, auto-refetches on updates.

---

## File Structure

```
/src
├── /app
│   ├── /admin           # Admin pages (main dashboard, players, payments, etc.)
│   ├── /dashboard       # Player dashboard
│   ├── /profile         # Player profile & settings
│   ├── /login, /signup  # Auth pages
│   └── page.tsx         # Home
├── /components
│   ├── /admin           # AdminNav, SkillRatingEditor
│   ├── /game            # GameStatusCard, PlayerActions, etc.
│   ├── /layout          # Header
│   └── /ui              # shadcn/ui components
├── /contexts            # AuthContext
├── /hooks               # useGame, useProfile, useStrikeSettings, useRequireAuth
├── /lib
│   ├── /supabase        # client.ts, server.ts
│   ├── constants.ts     # Game config, deadlines
│   ├── utils.ts         # Helpers (cn, formatDate, etc.)
│   └── uploadProfilePicture.ts  # Storage upload helper
└── /types               # database.ts (Supabase types)

/supabase                # SQL migrations and seed files
/__tests__               # unit/, integration/, e2e/
```

---

## Admin Pages

| Route | Purpose |
|-------|---------|
| `/admin` | Main dashboard - game management, team balancing, lineup |
| `/admin/players` | Manage players, skill ratings, roles |
| `/admin/payments` | Verify payments |
| `/admin/strikes` | Configure strike system, manage cooldowns |
| `/admin/refunds` | Approve/deny refund requests |
| `/admin/teams` | Team assignments view |
| `/admin/lineup` | View/download team lineups |
| `/admin/admins` | Manage admin roles (super_admin only) |

**Roles:** `player` → `admin` → `super_admin`

---

## Key Patterns

**Always refetch after mutations:**
```typescript
const { error } = await supabase.from('table').update(data)
if (!error) refetch()
```

**Handle loading/error states:**
```typescript
if (loading) return <Loader2 className="animate-spin" />
if (error) return <Alert variant="destructive">{error}</Alert>
```

**RLS enforces security** - Frontend only checks roles for UI display, not access control.

**Real-time cleanup:**
```typescript
useEffect(() => {
  const channel = supabase.channel('changes').subscribe()
  return () => { channel.unsubscribe() }
}, [])
```

---

## Environment Safety

1. Run `npm run check-env` before destructive operations
2. Never run `supabase db reset` when pointing to production
3. Test users (`@dropin.test`) should only exist in local database
4. Never commit `.env.local` with production keys
