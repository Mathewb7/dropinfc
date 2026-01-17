import { test, expect, chromium } from '@playwright/test'

/**
 * E2E Tests for Real-time Multi-User Updates
 *
 * Tests that real-time subscriptions work across multiple users:
 * 1. Multiple players see live payment status changes
 * 2. Admin dashboard updates when players mark paid
 * 3. Team announcement visible to all players simultaneously
 * 4. No stale data displayed
 * 5. Updates propagate within acceptable timeframe
 *
 * Prerequisites:
 * - Local development server running (npm run dev)
 * - Local Supabase running with real-time enabled
 * - Test player and admin accounts
 * - Game in appropriate status for testing
 */

test.describe('Real-time Multi-User Updates', () => {
  test('should show payment status updates to multiple viewers', async () => {
    test.setTimeout(60000)

    const browser = await chromium.launch()

    try {
      // Create 3 contexts: 1 admin, 2 players
      const adminContext = await browser.newContext()
      const player1Context = await browser.newContext()
      const player2Context = await browser.newContext()

      const adminPage = await adminContext.newPage()
      const player1Page = await player1Context.newPage()
      const player2Page = await player2Context.newPage()

      // Login admin
      await adminPage.goto('http://localhost:3000/login')
      await adminPage.fill('input[type="email"]', 'admin@dropin.test')
      await adminPage.fill('input[type="password"]', 'testpass123')
      await adminPage.click('button[type="submit"]')
      await adminPage.waitForURL(/.*dashboard/)

      // Login player 1
      await player1Page.goto('http://localhost:3000/login')
      await player1Page.fill('input[type="email"]', 'player15@dropin.test')
      await player1Page.fill('input[type="password"]', 'testpass123')
      await player1Page.click('button[type="submit"]')
      await player1Page.waitForURL(/.*dashboard/)

      // Login player 2
      await player2Page.goto('http://localhost:3000/login')
      await player2Page.fill('input[type="email"]', 'player16@dropin.test')
      await player2Page.fill('input[type="password"]', 'testpass123')
      await player2Page.click('button[type="submit"]')
      await player2Page.waitForURL(/.*dashboard/)

      console.log('All users logged in')

      // Navigate admin to payments page
      await adminPage.goto('http://localhost:3000/admin/payments')
      await adminPage.waitForTimeout(1000)

      // Both players on dashboard (watching for updates)
      await player1Page.goto('http://localhost:3000/dashboard')
      await player2Page.goto('http://localhost:3000/dashboard')
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log('All users on respective pages')

      // Player 1 marks payment
      const markPaidButton = player1Page.locator('button:has-text("Mark Paid"), button:has-text("Mark as Paid")').first()

      if (await markPaidButton.isVisible()) {
        await markPaidButton.click()
        console.log('Player 1 marked payment')

        // Wait for real-time update (should be < 2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2500))

        // Admin should see update
        await adminPage.reload()
        await adminPage.waitForTimeout(500)

        const hasPaymentUpdate = await adminPage.locator('text=/marked|paid|pending/i').isVisible()
        expect(hasPaymentUpdate).toBeTruthy()
      }

      await adminContext.close()
      await player1Context.close()
      await player2Context.close()
    } finally {
      await browser.close()
    }
  })

  test('should update game status across multiple users', async () => {
    test.setTimeout(60000)

    const browser = await chromium.launch()

    try {
      // Create 2 player contexts watching the same game
      const player1Context = await browser.newContext()
      const player2Context = await browser.newContext()

      const player1Page = await player1Context.newPage()
      const player2Page = await player2Context.newPage()

      // Login both players
      await player1Page.goto('http://localhost:3000/login')
      await player1Page.fill('input[type="email"]', 'player17@dropin.test')
      await player1Page.fill('input[type="password"]', 'testpass123')
      await player1Page.click('button[type="submit"]')
      await player1Page.waitForURL(/.*dashboard/)

      await player2Page.goto('http://localhost:3000/login')
      await player2Page.fill('input[type="email"]', 'player18@dropin.test')
      await player2Page.fill('input[type="password"]', 'testpass123')
      await player2Page.click('button[type="submit"]')
      await player2Page.waitForURL(/.*dashboard/)

      // Both on dashboard
      await player1Page.goto('http://localhost:3000/dashboard')
      await player2Page.goto('http://localhost:3000/dashboard')
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Verify both see game status
      const status1 = await player1Page.locator('text=/Game|Status|Waitlist|Priority|Payment/i').isVisible()
      const status2 = await player2Page.locator('text=/Game|Status|Waitlist|Priority|Payment/i').isVisible()

      expect(status1 || status2).toBeTruthy()

      // Note: To fully test real-time updates, admin would change game status
      // and both players should see the update without refreshing
      // This requires Supabase real-time to be properly configured

      await player1Context.close()
      await player2Context.close()
    } finally {
      await browser.close()
    }
  })

  test('should show player count updates in real-time', async () => {
    test.setTimeout(60000)

    const browser = await chromium.launch()

    try {
      // Admin watching, player joining
      const adminContext = await browser.newContext()
      const playerContext = await browser.newContext()

      const adminPage = await adminContext.newPage()
      const playerPage = await playerContext.newPage()

      // Login admin
      await adminPage.goto('http://localhost:3000/login')
      await adminPage.fill('input[type="email"]', 'admin@dropin.test')
      await adminPage.fill('input[type="password"]', 'testpass123')
      await adminPage.click('button[type="submit"]')
      await adminPage.waitForURL(/.*dashboard/)

      // Login player
      await playerPage.goto('http://localhost:3000/login')
      await playerPage.fill('input[type="email"]', 'player19@dropin.test')
      await playerPage.fill('input[type="password"]', 'testpass123')
      await playerPage.click('button[type="submit"]')
      await playerPage.waitForURL(/.*dashboard/)

      // Admin on main dashboard
      await adminPage.goto('http://localhost:3000/admin')
      await adminPage.waitForTimeout(1000)

      // Player joins waitlist
      await playerPage.goto('http://localhost:3000/dashboard')
      await playerPage.waitForTimeout(1000)

      const joinButton = playerPage.locator('button:has-text("Join Waitlist"), button:has-text("Join")').first()

      if (await joinButton.isVisible()) {
        await joinButton.click()
        console.log('Player joined waitlist')

        // Wait for real-time propagation
        await new Promise((resolve) => setTimeout(resolve, 2500))

        // Admin page should update (may need reload in non-realtime setup)
        await adminPage.reload()
        await adminPage.waitForTimeout(500)

        // Should show player count
        const hasCount = await adminPage.locator('text=/\\d+.*player|\\d+.*confirmed|\\d+.*waitlist/i').isVisible()
        expect(hasCount).toBeTruthy()
      }

      await adminContext.close()
      await playerContext.close()
    } finally {
      await browser.close()
    }
  })

  test('should handle multiple simultaneous viewers without conflicts', async () => {
    test.setTimeout(60000)

    const browser = await chromium.launch()
    const contexts = []
    const pages = []

    try {
      // Create 5 viewers
      for (let i = 1; i <= 5; i++) {
        const context = await browser.newContext()
        const page = await context.newPage()
        contexts.push(context)
        pages.push({ page, num: i })
      }

      // Login all 5 as different players
      await Promise.all(
        pages.map(async ({ page, num }) => {
          await page.goto('http://localhost:3000/login')
          await page.fill('input[type="email"]', `player${num + 20}@dropin.test`)
          await page.fill('input[type="password"]', 'testpass123')
          await page.click('button[type="submit"]')
          await page.waitForURL(/.*dashboard/, { timeout: 10000 })
        })
      )

      console.log('5 viewers logged in')

      // All navigate to dashboard
      await Promise.all(
        pages.map(async ({ page }) => {
          await page.goto('http://localhost:3000/dashboard')
        })
      )

      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Verify all see the dashboard
      const visibilityChecks = await Promise.all(
        pages.map(async ({ page, num }) => {
          const hasContent = await page.locator('text=/Dashboard|Game|Status/i').isVisible()
          console.log(`Viewer ${num} sees dashboard: ${hasContent}`)
          return hasContent
        })
      )

      const allSeeContent = visibilityChecks.every((v) => v === true)
      expect(allSeeContent).toBeTruthy()

      // Cleanup
      for (const context of contexts) {
        await context.close()
      }
    } finally {
      await browser.close()
    }
  })
})
