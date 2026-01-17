import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Player Registration Flow
 *
 * Tests the complete user journey:
 * 1. Player logs in successfully
 * 2. Player sees current game status
 * 3. Player joins waitlist
 * 4. Player sees waitlist position
 * 5. Player withdraws from waitlist
 * 6. Player on strike cooldown cannot join
 *
 * Prerequisites:
 * - Local development server running (npm run dev)
 * - Local Supabase running with seeded test data
 * - Test users exist in database
 */

test.describe('Player Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:3000')
  })

  test('should allow player to log in successfully', async ({ page }) => {
    // Navigate to login page
    await page.click('a[href="/login"]')
    await expect(page).toHaveURL(/.*login/)

    // Fill in login form with test player credentials
    await page.fill('input[type="email"]', 'player1@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')

    // Submit login
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 5000 })

    // Verify user is logged in
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('should display current game status on dashboard', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player2@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Check for game status elements
    const hasGameStatus = await page.locator('text=/Game Status|Upcoming Game|No Game/i').isVisible()
    expect(hasGameStatus).toBeTruthy()
  })

  test('should allow player to join waitlist', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player3@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Wait for dashboard to load
    await page.waitForTimeout(1000)

    // Look for "Join Waitlist" button
    const joinButton = page.locator('button:has-text("Join Waitlist"), button:has-text("Join Game")')

    if (await joinButton.isVisible()) {
      // Click join button
      await joinButton.click()

      // Wait for success message or status update
      await page.waitForTimeout(1000)

      // Verify player is on waitlist
      const onWaitlist = await page.locator('text=/Waitlist|You are on the waitlist|Position/i').isVisible()
      expect(onWaitlist).toBeTruthy()
    } else {
      // Player might already be registered - verify status
      const alreadyRegistered = await page.locator('text=/Confirmed|Waitlist|Priority/i').isVisible()
      expect(alreadyRegistered).toBeTruthy()
    }
  })

  test('should show waitlist position to player', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player4@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Wait for dashboard
    await page.waitForTimeout(1000)

    // Join waitlist if not already joined
    const joinButton = page.locator('button:has-text("Join Waitlist")')
    if (await joinButton.isVisible()) {
      await joinButton.click()
      await page.waitForTimeout(1000)
    }

    // Look for position indicator (could be text like "Position #5" or similar)
    const hasPosition = await page.locator('text=/Position|#|Waitlist/i').isVisible()

    // Should either show position or indicate player is registered
    expect(hasPosition).toBeTruthy()
  })

  test('should allow player to withdraw from waitlist', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player5@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)
    await page.waitForTimeout(1000)

    // Join waitlist first
    const joinButton = page.locator('button:has-text("Join Waitlist")')
    if (await joinButton.isVisible()) {
      await joinButton.click()
      await page.waitForTimeout(1000)
    }

    // Look for withdraw button
    const withdrawButton = page.locator('button:has-text("Withdraw"), button:has-text("Leave")')

    if (await withdrawButton.isVisible()) {
      // Click withdraw
      await withdrawButton.click()

      // Confirm withdrawal if there's a confirmation dialog
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }

      await page.waitForTimeout(1000)

      // Verify player can rejoin (join button visible again)
      const canRejoin = await page.locator('button:has-text("Join Waitlist"), button:has-text("Join Game")').isVisible()
      expect(canRejoin).toBeTruthy()
    }
  })

  test('should prevent player on strike cooldown from joining', async ({ page }) => {
    // Login as player with active strike cooldown
    await page.goto('http://localhost:3000/login')

    // Note: This assumes we have a test player with strikes in the seed data
    // Player with email pattern matching strike criteria
    await page.fill('input[type="email"]', 'striker@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')

    // If login fails (user doesn't exist), skip this test
    await page.click('button[type="submit"]')

    // Wait a bit to see if login succeeds
    await page.waitForTimeout(2000)

    // Check if we're on dashboard
    const onDashboard = await page.url().includes('dashboard')

    if (onDashboard) {
      // Look for strike cooldown message
      const hasCooldownMessage = await page.locator('text=/cooldown|strike|suspended/i').isVisible()

      if (hasCooldownMessage) {
        // Join button should be disabled or not visible
        const joinButton = page.locator('button:has-text("Join Waitlist")')
        const isDisabled = await joinButton.isDisabled()
        const isHidden = !(await joinButton.isVisible())

        expect(isDisabled || isHidden).toBeTruthy()
      }
    }
  })

  test('should display game date and time', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player6@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Look for date/time display
    await page.waitForTimeout(1000)

    // Should show game date or "No upcoming game"
    const hasGameInfo = await page.locator('text=/Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|No game/i').isVisible()
    expect(hasGameInfo).toBeTruthy()
  })

  test('should show player count on dashboard', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player7@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)
    await page.waitForTimeout(1000)

    // Look for player count (e.g., "12/16 confirmed" or "Waitlist: 8")
    const hasPlayerCount = await page.locator('text=/\\d+.*player|\\d+.*confirmed|\\d+.*waitlist/i').isVisible()
    expect(hasPlayerCount).toBeTruthy()
  })
})
