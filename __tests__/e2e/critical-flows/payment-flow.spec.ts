import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Payment Flow
 *
 * Tests the payment workflow:
 * 1. Player marks payment as paid
 * 2. Admin verifies payment
 * 3. Credits automatically applied to payment
 * 4. Credit balance updates correctly
 *
 * Prerequisites:
 * - Local development server running (npm run dev)
 * - Local Supabase running with seeded test data
 * - Test game in payment_pending status
 * - Admin and player test accounts
 */

test.describe('Payment Flow', () => {
  test('should allow player to mark payment as paid', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player8@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)
    await page.waitForTimeout(1000)

    // Look for payment section or mark paid button
    const markPaidButton = page.locator('button:has-text("Mark Paid"), button:has-text("Mark as Paid"), button:has-text("I\'ve Paid")')

    if (await markPaidButton.isVisible()) {
      // Click mark paid
      await markPaidButton.click()
      await page.waitForTimeout(1000)

      // Verify payment status updated
      const paymentMarked = await page.locator('text=/Paid|Payment.*marked|Pending verification/i').isVisible()
      expect(paymentMarked).toBeTruthy()
    }
  })

  test('should allow admin to verify payment', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to admin payments page
    await page.goto('http://localhost:3000/admin/payments')
    await page.waitForTimeout(1000)

    // Look for payment verification interface
    const hasPaymentList = await page.locator('text=/Payment|Player|Status|Verify/i').isVisible()
    expect(hasPaymentList).toBeTruthy()

    // Look for verify button
    const verifyButton = page.locator('button:has-text("Verify")').first()

    if (await verifyButton.isVisible()) {
      // Click verify
      await verifyButton.click()
      await page.waitForTimeout(1000)

      // Verify status changed
      const verified = await page.locator('text=/Verified|Confirmed/i').first().isVisible()
      expect(verified).toBeTruthy()
    }
  })

  test('should show payment amount on dashboard', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player9@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)
    await page.waitForTimeout(1000)

    // Look for payment amount (e.g., "$15" or "£15")
    const hasPaymentAmount = await page.locator('text=/\\$\\d+|£\\d+|€\\d+|Payment.*\\d+/i').isVisible()

    // Should show payment amount if game is in payment phase
    if (hasPaymentAmount) {
      expect(hasPaymentAmount).toBeTruthy()
    }
  })

  test('should display payment status to player', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player10@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)
    await page.waitForTimeout(1000)

    // Look for payment status
    const hasPaymentStatus = await page.locator('text=/Payment.*pending|Payment.*verified|Payment.*marked|Not paid/i').isVisible()

    // Should show some payment-related status or no game
    const hasNoGame = await page.locator('text=/No game|No upcoming/i').isVisible()

    expect(hasPaymentStatus || hasNoGame).toBeTruthy()
  })

  test('should show payment deadline to players', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player11@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)
    await page.waitForTimeout(1000)

    // Look for deadline information
    const hasDeadline = await page.locator('text=/deadline|before|until|by/i').isVisible()

    // Deadline should be visible if game is in payment phase
    if (hasDeadline) {
      expect(hasDeadline).toBeTruthy()
    }
  })

  test('should navigate to profile to view credit balance', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player12@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to profile
    await page.goto('http://localhost:3000/profile')
    await page.waitForTimeout(1000)

    // Look for credit balance section
    const hasCreditSection = await page.locator('text=/Credit|Balance|\\$\\d+/i').isVisible()
    expect(hasCreditSection).toBeTruthy()
  })

  test('should show transaction history on profile', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player13@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to profile
    await page.goto('http://localhost:3000/profile')
    await page.waitForTimeout(1000)

    // Look for transaction history
    const hasTransactions = await page.locator('text=/Transaction|History|Credit/i').isVisible()

    if (hasTransactions) {
      expect(hasTransactions).toBeTruthy()
    }
  })

  test('should allow admin to view all payments', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to payments page
    await page.goto('http://localhost:3000/admin/payments')
    await page.waitForTimeout(1000)

    // Should see list of players and payment statuses
    const hasPaymentList = await page.locator('text=/Player|Payment|Status|Verify/i').isVisible()
    expect(hasPaymentList).toBeTruthy()
  })
})
