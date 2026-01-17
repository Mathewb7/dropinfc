# DropIn FC Testing Checklist

## 🎯 Testing Overview

This checklist covers all features built in Phases 1-4. Test systematically to ensure everything works.

---

## ✅ Phase 1: Authentication & Basic UI

### 1. Signup Flow
- [ ] Go to `/signup`
- [ ] Fill in all fields:
  - Email (use a test email like `test.player@example.com`)
  - Password (min 6 characters)
  - Display Name (e.g., "Test Player")
  - WhatsApp Name (e.g., "Test P")
  - Check "I'm a Permanent Keeper" (optional)
- [ ] Click "Sign Up"
- [ ] **Expected:** Success message, redirected to dashboard
- [ ] **Check:** Profile created in Supabase `profiles` table

### 2. Login Flow
- [ ] Log out (click profile icon → Logout)
- [ ] Go to `/login`
- [ ] Enter email and password
- [ ] Toggle "Show password" checkbox - verify password is visible
- [ ] Click "Log In"
- [ ] **Expected:** Redirected to dashboard

### 3. UI Components
- [ ] **Header:** Logo, Dashboard/Profile/Admin links visible
- [ ] **Profile Icon:** Click it, see dropdown with Logout
- [ ] **Input Fields:** Text is black and readable
- [ ] **Labels:** Text is black and readable
- [ ] **Buttons:** Styled consistently with hover effects

---

## ✅ Phase 2: Player Dashboard & Profile

### 4. Player Dashboard (as Super Admin - You)

Navigate to `/dashboard`

#### Game Status Card
- [ ] **Game Date:** Shows "Monday, January 12, 2026, 8:30 PM"
- [ ] **Location:** "Windsor Bubble, North Vancouver"
- [ ] **Game Status Badge:** "Waitlist Open" (green)
- [ ] **Your Status Badge:** "Priority Confirmed - Verified" (green)
- [ ] **Player Count:** "10 / 16 players confirmed"
- [ ] **Deadlines:** Shows countdown timers for:
  - Priority Deadline
  - Payment Reminder
  - Payment Deadline

#### Action Buttons
- [ ] **Should see:** "Withdraw" button only (since you're already confirmed and paid)
- [ ] **Should NOT see:** "Join Waitlist" or "I've Paid" buttons

#### Priority Players List
- [ ] **Should see:** Section showing "Priority Players Confirmed"
- [ ] **Expected:** List of 4 other priority players (excluding you)

### 5. Profile Page

Navigate to `/profile`

#### Profile Information
- [ ] **Display Name:** "Mathew" (editable)
- [ ] **Email:** "mathewbailey1990@gmail.com" (read-only)
- [ ] **WhatsApp Name:** Shows your WhatsApp name (editable)
- [ ] **Role Badge:** "Super Admin" (blue badge)
- [ ] **Permanent Keeper:** Checkbox shows your status (editable)

#### Game Statistics
- [ ] **Total Games Played:** Shows number
- [ ] **Weeks Since Last Played:** Shows number
- [ ] **Times Started as Sub:** Shows number
- [ ] **Average Skill Rating:** Shows number

#### Credit & Transactions
- [ ] **Credit Balance Card:** Shows "$0.00" (or current balance)
- [ ] **Transaction History:** Empty table or shows transactions if any exist

#### Actions
- [ ] Click "Edit Profile" button
- [ ] Make a change (e.g., update WhatsApp name)
- [ ] Click "Save Changes"
- [ ] **Expected:** Success message, profile updated

---

## ✅ Phase 3: Admin Dashboard

### 6. Admin Access

Navigate to `/admin`

- [ ] **Can access:** Admin dashboard loads (no "Access Denied" message)
- [ ] **Sidebar Navigation:** Shows links to all admin pages:
  - Dashboard
  - Game Management
  - Players
  - Payments
  - Lottery
  - Teams
  - Lineup
  - Messages
  - Refunds
  - Admins

### 7. Admin Dashboard (`/admin`)

#### Overview Cards
- [ ] **Current Game Card:**
  - Game date and time
  - Status badge
  - Location
- [ ] **Player Counts:**
  - Total players registered
  - Confirmed players (10/16)
  - Waitlist players (5)
- [ ] **Payment Status:**
  - Paid: Shows count
  - Unpaid: Shows count

#### Quick Actions
- [ ] Buttons visible for quick actions (we'll test these later)

### 8. Player Management (`/admin/players`)

- [ ] **Player Table:** Shows all 17 players (you + 16 test)
- [ ] **Columns visible:**
  - Name
  - Email
  - WhatsApp Name
  - Skill Rating (stars)
  - Role badge
  - Stats (games played, weeks since last)
  - Credit balance
  - Actions

#### Test Skill Rating Editor
- [ ] Find a test player (e.g., "John Keeper")
- [ ] Click on their skill rating stars
- [ ] Change rating (e.g., from 4 to 5 stars)
- [ ] **Expected:** Rating updates immediately
- [ ] Refresh page, verify rating persisted

#### Test Role Management (Super Admin Only)
- [ ] Search for a test player
- [ ] Click "Promote to Admin" button
- [ ] **Expected:** Player role changes to "Admin"
- [ ] Click "Demote to Player" button
- [ ] **Expected:** Role changes back to "Player"

### 9. Game Management (`/admin/game`)

#### View Current Game
- [ ] **Game Details Card:** Shows current game info
- [ ] **Edit fields:**
  - Game Date
  - Priority Deadline
  - Sunday Lottery Deadline
  - Payment Reminder Time
  - Payment Deadline
  - Status dropdown

#### Edit Game
- [ ] Change a date (e.g., move priority deadline 1 hour forward)
- [ ] Click "Update Game"
- [ ] **Expected:** Success message
- [ ] Refresh `/dashboard` to verify change reflected

#### Create New Game
- [ ] Scroll to "Create New Game" section
- [ ] All dates should auto-fill for next Tuesday
- [ ] Click "Create Game"
- [ ] **Expected:** Success message
- [ ] **Check:** New game appears (but keep testing with current game)

### 10. Payment Management (`/admin/payments`)

#### View Payment Status
- [ ] **Tabs:** "Unpaid" and "Paid"
- [ ] **Unpaid Tab:** Shows players with pending/marked_paid status
- [ ] **Paid Tab:** Shows players with verified status
- [ ] **Summary:** Total amounts displayed

#### Test Verify Payment
- [ ] Find a player with "Marked Paid" status (e.g., "Emma Speed")
- [ ] Click "Verify Payment" button
- [ ] **Expected:** Player moves to "Paid" tab with "Verified" badge

#### Test Mark Unpaid
- [ ] In "Paid" tab, find a player
- [ ] Click "Mark Unpaid" button
- [ ] **Expected:** Confirmation dialog
- [ ] Confirm action
- [ ] **Expected:** Player moves to "Unpaid" tab

---

## ✅ Phase 4: Advanced Admin Features

### 11. Lottery System (`/admin/lottery`)

- [ ] **Waitlist Display:** Shows 5 waitlist players with their stats:
  - Name
  - Weeks since last played
  - Times started as sub
  - Total games played
  - Calculated weight
- [ ] **Available Slots:** Shows "6 slots available" (16 - 10 confirmed)

#### Run Lottery
- [ ] Click "Run Lottery for 6 Slots" button
- [ ] **Expected:** Shows selected players with their weights
- [ ] **Results display:** 6 players selected from waitlist
- [ ] Click "Confirm Selection" button
- [ ] **Expected:** Success message
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** Player count now shows "16 / 16 players confirmed"

### 12. Team Balancing (`/admin/teams`)

- [ ] **Prerequisites:** Need 16 confirmed + paid players
- [ ] Click "Generate Teams" button
- [ ] **Expected:** Two team boxes appear:
  - **Dark Team:** Shows 8 players with total skill rating
  - **Light Team:** Shows 8 players with total skill rating
  - Skill totals should be close (balanced)

#### Check Keeper Assignment
- [ ] **Expected:** John Keeper (is_permanent_keeper = true) assigned to one team as Keeper
- [ ] Second keeper auto-assigned to other team

#### Regenerate Teams
- [ ] Click "Regenerate Teams" button
- [ ] **Expected:** New team composition
- [ ] Skill totals still balanced

#### Assign Positions
- [ ] Click "Assign Positions" button
- [ ] **Expected:** Positions assigned:
  - 1 Keeper per team
  - 4 Field players per team
- [ ] Starting/Sub status assigned fairly (players with higher `times_started_as_sub` get priority to start)

#### Confirm Teams
- [ ] Click "Confirm Teams" button
- [ ] **Expected:** Success message
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** "Your Team" card appears showing:
  - Your team (Dark or Light)
  - Your position
  - Starting or Sub status
  - Your teammates with their positions

### 13. WhatsApp Message Generator (`/admin/messages`)

#### Test Message Types
- [ ] **Dropdown:** Select "Priority Invites"
- [ ] **Expected:** Message appears with:
  - "@Mathew @John K @Mike S..." (all priority players @mentioned)
  - Confirmation deadline
  - Game details
- [ ] Click "Copy to Clipboard"
- [ ] **Expected:** Success message
- [ ] Paste into notes app to verify copied correctly

Repeat for each message type:
- [ ] **Lottery Winners:** @mentions lottery selected players
- [ ] **Payment Reminder:** @mentions unpaid players
- [ ] **Team Announcement:** Shows both team lineups with @mentions

### 14. Lineup Image Generator (`/admin/lineup`)

- [ ] **Prerequisites:** Teams must be announced
- [ ] **Expected:** Preview shows beautiful lineup image:
  - "DropIn FC - Tuesday [Date]" header
  - Dark team box (left): Keeper + 4 Field + 3 Subs
  - Light team box (right): Same format
  - Game time and location at bottom
  - Gradient background

#### Download Image
- [ ] Click "Download as JPG" button
- [ ] **Expected:** Browser downloads `dropin-lineup.png`
- [ ] Open downloaded image
- [ ] **Expected:** High-quality lineup image ready to share on WhatsApp

### 15. Refund Management (`/admin/refunds`)

#### View Refunds Page
- [ ] Navigate to `/admin/refunds`
- [ ] **Expected:** Two sections:
  - Pending Refunds (likely empty)
  - Processed Refunds (likely empty)

#### Create Test Refund (as Player)
To test this, you need to request a refund as a player first:

1. **Open browser incognito window**
2. Go to your app URL
3. Sign up as new test player OR use existing test account
4. Navigate to `/profile`
5. Look for "Request Refund" button (if you implemented it)
6. OR manually insert a refund request via SQL:

```sql
INSERT INTO refund_requests (player_id, game_id, amount, reason, status)
VALUES (
  (SELECT id FROM profiles WHERE email = 'john@test.com'),
  (SELECT id FROM games ORDER BY created_at DESC LIMIT 1),
  15.00,
  'Cannot make it to the game due to family emergency',
  'pending'
);
```

#### Process Refund (as Admin)
- [ ] Refresh `/admin/refunds`
- [ ] **Pending Refunds:** Should show 1 request
- [ ] **Displays:** Player name, email, game date, amount, reason
- [ ] **Admin Notes Field:** Add a note (e.g., "Approved - valid reason")
- [ ] Click "Approve & Add Credit" button
- [ ] **Expected:**
  - Success message
  - Refund moves to "Processed Refunds" section
  - Status shows "Approved"
- [ ] Navigate to `/admin/players`
- [ ] Find the player (John Keeper)
- [ ] **Expected:** Credit balance shows $15.00

#### Test Deny Refund
- [ ] Create another test refund (via SQL or player account)
- [ ] In `/admin/refunds`, add admin note (e.g., "Within 24hrs of game")
- [ ] Click "Deny" button
- [ ] **Expected:**
  - Refund moves to "Processed Refunds"
  - Status shows "Denied"
  - Player credit balance unchanged

### 16. Admin Management (`/admin/admins`)

#### Access Check
- [ ] Navigate to `/admin/admins`
- [ ] **Expected:** Page loads (only super admins can access)

#### View Current Admins
- [ ] **List shows:** All users with admin/super_admin role
- [ ] **Your account:** Shows "Super Admin" badge
- [ ] **No demote button:** For your own account

#### Promote Player to Admin
- [ ] **Search field:** Enter test player email (e.g., "mike@test.com")
- [ ] Click "Search" button
- [ ] **Expected:** Search results show matching players
- [ ] Click "Promote to Admin" button next to Mike Striker
- [ ] **Expected:**
  - Success message
  - Mike appears in "Current Admins" list with "Admin" badge
  - Search results cleared

#### Demote Admin to Player
- [ ] Find Mike Striker in "Current Admins" list
- [ ] Click "Demote" button
- [ ] **Expected:**
  - Success message
  - Mike removed from admins list

#### Test Self-Demotion Block
- [ ] Try to demote yourself (if button exists)
- [ ] **Expected:** Error message "You cannot demote yourself"

---

## 🧪 Edge Cases & Error Handling

### 17. Player Action Flows

#### Test Withdraw with Credit
- [ ] As a paid player, click "Withdraw" button
- [ ] **Expected:** Confirmation dialog explaining credit will be added
- [ ] Confirm withdrawal
- [ ] **Expected:**
  - Status changes to "Withdrawn"
  - $15 credit added to profile
  - Slot opens for lottery

#### Test Join Waitlist
To test this, use an incognito browser or different test account:
- [ ] Sign up as new player
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** "Join Waitlist" button (if waitlist_open)
- [ ] Click button
- [ ] **Expected:**
  - Status changes to "Waitlist"
  - Count updates
  - Button changes to waiting message

#### Test Priority Confirmation Flow
To test, you'd need to create a new game and set a player as priority_invited:
- [ ] In SQL Editor, update a test player to `status = 'priority_invited'`
- [ ] Log in as that player
- [ ] **Expected:** "Confirm" and "Decline" buttons
- [ ] Click "Confirm"
- [ ] **Expected:** Status changes to "priority_confirmed"

### 18. Error States

#### No Games Scheduled
- [ ] In SQL Editor, delete all games temporarily:
```sql
-- Save game ID first to restore later
SELECT id FROM games ORDER BY created_at DESC LIMIT 1;

-- Delete all games
DELETE FROM games;
```
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** "No Upcoming Games" message
- [ ] **Restore game:**
```sql
-- Re-run create game SQL or restore from backup
```

#### Network Error Handling
- [ ] Open browser DevTools → Network tab
- [ ] Set throttling to "Offline"
- [ ] Try to load `/dashboard`
- [ ] **Expected:** Loading spinner → Error message
- [ ] Restore network
- [ ] **Expected:** Auto-retry or manual retry button works

#### Unauthorized Access
- [ ] Log out
- [ ] Try to visit `/admin` directly
- [ ] **Expected:** Redirected to `/login`
- [ ] Log in as regular player (not admin)
- [ ] Try to visit `/admin/admins`
- [ ] **Expected:** "Access Denied" message

---

## 📱 Mobile Responsiveness

### 19. Test on Mobile Device or Browser

#### Resize Browser
- [ ] Open Chrome DevTools
- [ ] Toggle device toolbar (Cmd+Shift+M or Ctrl+Shift+M)
- [ ] Select "iPhone 12 Pro" or similar

#### Check Dashboard
- [ ] **Game Status Card:** Stacks vertically, readable
- [ ] **Action Buttons:** Full width, easy to tap
- [ ] **Tables:** Convert to cards or scroll horizontally

#### Check Admin Pages
- [ ] **Player Table:** Responsive, scrolls or stacks
- [ ] **Navigation:** Sidebar collapses to hamburger menu
- [ ] **Forms:** Full width, large touch targets

---

## 🎨 Visual Polish

### 20. UI Consistency

- [ ] **Colors:** Indigo theme consistent throughout
- [ ] **Badges:** Different colors for different statuses (green = confirmed, yellow = pending, etc.)
- [ ] **Spacing:** Consistent padding/margins
- [ ] **Typography:** Clear hierarchy (h1, h2, body text)
- [ ] **Icons:** Used appropriately (lucide-react icons)

### 21. Loading States

- [ ] **All buttons:** Show spinner when processing
- [ ] **All pages:** Show loading spinner while fetching data
- [ ] **Disabled states:** Buttons disabled during loading

### 22. Success/Error Messages

- [ ] **Toasts or Alerts:** Appear after actions
- [ ] **Success:** Green color, positive message
- [ ] **Errors:** Red color, helpful error message
- [ ] **Auto-dismiss:** Disappear after a few seconds

---

## 🚀 Production Readiness

### 23. Environment Variables

- [ ] `.env.local` file exists with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Values are correct and not committed to git

### 24. Security Checks

- [ ] **RLS Policies:** Enabled on all tables
- [ ] **Auth Required:** Protected routes require login
- [ ] **Admin Routes:** Only accessible to admin/super_admin
- [ ] **No Sensitive Data:** API keys not exposed in client code

### 25. Performance

- [ ] **Page Load Times:** < 2 seconds on good connection
- [ ] **Real-time Updates:** Changes reflect immediately
- [ ] **Database Queries:** No N+1 queries (check Supabase logs)

---

## ✨ Final Acceptance Test

### 26. Complete User Journey

#### As a Player
1. [ ] Sign up
2. [ ] View dashboard and see game
3. [ ] Join waitlist
4. [ ] Get selected in lottery
5. [ ] Mark as paid
6. [ ] See team assignment
7. [ ] View profile and stats
8. [ ] Request refund

#### As an Admin
1. [ ] Log in
2. [ ] Create new game
3. [ ] Manage players (view, edit skill ratings)
4. [ ] Verify payments
5. [ ] Run lottery
6. [ ] Generate balanced teams
7. [ ] Assign positions
8. [ ] Generate WhatsApp messages
9. [ ] Download lineup image
10. [ ] Process refunds
11. [ ] Manage admins

---

## 📊 Testing Summary

After completing all tests, fill this out:

### Bugs Found
- [ ] List any bugs or issues discovered

### Features Not Working
- [ ] List features that don't work as expected

### Performance Issues
- [ ] Note any slow pages or queries

### Improvements Needed
- [ ] UI tweaks
- [ ] Missing features
- [ ] Better error handling

---

## 🎉 Success Criteria

Your app is ready when:
- ✅ All Phase 1-4 features work
- ✅ No critical bugs
- ✅ Mobile responsive
- ✅ RLS policies secure
- ✅ Real-time updates work
- ✅ Admin functions complete
- ✅ Player experience smooth

**Ready to Deploy!** 🚀
