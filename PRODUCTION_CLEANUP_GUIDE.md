# Production Cleanup Guide
## Safely Remove Test Users from Production Database

### ⚠️ WARNING: This affects your live production database!

Follow these steps carefully to remove any test users that may have leaked into production.

---

## Step 1: Check What Exists in Production

1. Go to https://supabase.com/dashboard
2. Select your project: `lqushgfncphmnjiwtwlx`
3. Go to **SQL Editor** (left sidebar)
4. Run this query to see test users:

```sql
-- READ ONLY: Check for test users
SELECT
  'Test users in production:' as notice,
  id,
  email,
  created_at
FROM auth.users
WHERE email LIKE '%@dropin.test'
ORDER BY email;
```

5. **STOP HERE** - Write down how many users you see

---

## Step 2: Review What Will Be Deleted

If you see test users above, they will be deleted along with:
- Their profile records
- Their game registrations
- Their payment/credit history
- All related data (cascade delete)

**Real users are safe** - Only emails ending in `@dropin.test` will be affected.

---

## Step 3: Execute Cleanup (DESTRUCTIVE)

Only proceed if you're sure you want to delete the test users.

In the Supabase SQL Editor, run:

```sql
-- DESTRUCTIVE: Remove test users from production
BEGIN;

-- Delete test users (cascade deletes profiles and related data)
DELETE FROM auth.users
WHERE email LIKE '%@dropin.test';

-- Show what was deleted
SELECT 'Cleanup complete' as status;

COMMIT;
```

---

## Step 4: Verify Cleanup

Run the check query again from Step 1. You should see **0 results**.

---

## Step 5: Prevention

To prevent test users from entering production again:

1. **Always check environment** before working:
   ```bash
   npm run check-env
   ```

2. **Keep `.env.local` pointing to test** by default:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   ```

3. **Only switch to production** when deploying or managing live users

4. **Never commit** `.env.local` to git

---

## Alternative: Remove Specific Users

If you want to remove only specific test users (not all):

```sql
DELETE FROM auth.users
WHERE email IN (
  'admin@dropin.test',
  'player1@dropin.test'
  -- add specific emails here
);
```

---

## Rollback (if needed)

If you started a transaction with `BEGIN` but want to cancel:

```sql
ROLLBACK;  -- Cancels all changes
```

---

## Questions?

- Test users should ONLY exist in local Docker database
- Production should ONLY contain real users with real email addresses
- Run `npm run check-env` frequently to avoid confusion
