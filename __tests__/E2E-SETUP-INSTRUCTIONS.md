# E2E Test Setup Instructions

## Problem

The Supabase Auth API is failing to create users programmatically with error: "Database error creating new user". This appears to be a foreign key constraint issue between `auth.users` and `profiles` tables in local Supabase.

## Manual Workaround (Until Auth API Issue is Resolved)

Since automated user creation is failing, we need to manually create test users through Supabase Studio.

### Step 1: Open Supabase Studio

```bash
# Supabase Studio runs at:
http://127.0.0.1:54323
```

### Step 2: Create Test Users

Navigate to **Authentication → Users** and click **"Add user"** for each of these accounts:

#### Admin User
-  Email: `admin@dropin.test`
- Password: `testpass123`
- Confirm email: ✅ (checked)

#### Test Players (Create at least 5 for basic E2E tests)
- `player01@dropin.test` / `testpass123`
- `player02@dropin.test` / `testpass123`
- `player15@dropin.test` / `testpass123`
- `player16@dropin.test` / `testpass123`
- `player17@dropin.test` / `testpass123`

### Step 3: Update Profiles

After creating each auth user, the `handle_new_user` trigger should automatically create a basic profile. However, you may need to manually update some profile fields:

```sql
-- Run this in Supabase Studio SQL Editor

-- Set admin role
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@dropin.test';

-- Verify profiles were created
SELECT id, email, display_name, role
FROM profiles
WHERE email LIKE '%@dropin.test'
ORDER BY email;
```

### Step 4: Run E2E Tests

Once you have at least these users created, you can run E2E tests:

```bash
npm run test:e2e
```

## Alternative: Run E2E Tests with Fewer Users

If you only create the admin and 5 player accounts, you can run specific E2E test files that don't require 45 concurrent users:

```bash
# Run single test files
npx playwright test __tests__/e2e/critical-flows/player-registration.spec.ts
npx playwright test __tests__/e2e/critical-flows/admin-lottery.spec.ts
npx playwright test __tests__/e2e/edge-cases/lottery-edge-cases.spec.ts
```

## Why This Happened

1. The seed file (`supabase/seed_45_players.sql`) creates 47 profiles directly without corresponding `auth.users` entries
2. The `profiles` table has a foreign key constraint to `auth.users`
3. When trying to create auth users via the Auth API, the `handle_new_user` trigger fires
4. The trigger tries to insert into `profiles`, but this conflicts with the seed data
5. The Auth API returns a generic "Database error" without details

## Proper Fix (For Future)

The correct approach would be to:

1. Modify `seed_45_players.sql` to NOT create profiles directly
2. Create auth users first (which triggers profile creation)
3. Then UPDATE those profiles with detailed stats

This requires fixing the Auth API issue or using a different method to bulk-create auth users.

## Current Test Status

✅ **Unit Tests**: 25 passing
✅ **Integration Tests**: 58 passing
⏸️  **E2E Tests**: 72 scaffolds created, require manual auth user setup

**Total Automated**: 83 tests passing
**Coverage**: 45.54% (below 80% target, need AuthContext tests)
