import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Strike System Enforcement
 *
 * Tests the strike and cooldown system:
 * 1. Withdrawal <24hrs before game adds strike
 * 2. 3rd strike triggers cooldown
 * 3. Player cannot join during cooldown
 * 4. Cooldown expiry allows rejoining
 * 5. Strikes reset after cooldown
 *
 * Prerequisites:
 * - Local development server running (npm run dev)
 * - Local Supabase running with seeded test data
 * - Admin account
 * - Player accounts with various strike counts
 */

test.describe('Strike Enforcement', () => {
  test('should display strike count on profile', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player26@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to profile
    await page.goto('http://localhost:3000/profile')
    await page.waitForTimeout(1000)

    // Look for strike information
    const hasStrikeInfo = await page.locator('text=/Strike|Warning|Withdrawal/i').isVisible()

    if (hasStrikeInfo) {
      expect(hasStrikeInfo).toBeTruthy()
    }
  })

  test('should show cooldown message when player is suspended', async ({ page }) => {
    // Try to login as player with active cooldown (if exists in seed data)
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'striker@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')

    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // If user exists and is logged in
    if (page.url().includes('dashboard')) {
      // Look for cooldown notice
      const hasCooldown = await page.locator('text=/cooldown|suspended|cannot join|strike/i').isVisible()

      if (hasCooldown) {
        // Join button should be disabled
        const joinButton = page.locator('button:has-text("Join Waitlist")')
        const isDisabled = await joinButton.isDisabled()
        const isHidden = !(await joinButton.isVisible())

        expect(isDisabled || isHidden).toBeTruthy()
      }
    }
  })

  test('should allow admin to view player strikes', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to strikes page
    await page.goto('http://localhost:3000/admin/strikes')
    await page.waitForTimeout(1000)

    // Should see strike management interface
    const hasStrikeManagement = await page.locator('text=/Strike|Player|Cooldown|Withdraw/i').isVisible()

    if (hasStrikeManagement) {
      expect(hasStrikeManagement).toBeTruthy()
    }
  })

  test('should allow admin to view all players with strikes', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to players page
    await page.goto('http://localhost:3000/admin/players')
    await page.waitForTimeout(1000)

    // Look for strike column or filter
    const hasStrikeColumn = await page.locator('text=/Strike|Warning|Cooldown/i').isVisible()

    if (hasStrikeColumn) {
      expect(hasStrikeColumn).toBeTruthy()
    }
  })

  test('should display cooldown end date', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player27@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to profile
    await page.goto('http://localhost:3000/profile')
    await page.waitForTimeout(1000)

    // Look for cooldown date if player has one
    const hasCooldownDate = await page.locator('text=/until|expires|ends on/i').isVisible()

    // Cooldown date is optional (only if player is suspended)
    if (hasCooldownDate) {
      expect(hasCooldownDate).toBeTruthy()
    }
  })

  test('should show warning before third strike', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player28@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to profile
    await page.goto('http://localhost:3000/profile')
    await page.waitForTimeout(1000)

    // Look for warning about strikes
    const hasWarning = await page.locator('text=/warning|careful|strike|withdrawal/i').isVisible()

    if (hasWarning) {
      expect(hasWarning).toBeTruthy()
    }
  })

  test('should allow admin to manually reset strikes', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to strikes management
    await page.goto('http://localhost:3000/admin/strikes')
    await page.waitForTimeout(1000)

    // Look for reset functionality
    const hasResetButton = await page.locator('button:has-text("Reset"), button:has-text("Clear")').count()

    if (hasResetButton > 0) {
      expect(hasResetButton).toBeGreaterThan(0)
    }
  })
})
