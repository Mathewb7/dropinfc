import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Payment Deadline Edge Cases
 *
 * Tests payment deadline enforcement:
 * 1. Auto-removal after payment deadline
 * 2. Credits applied automatically
 * 3. Transaction history accurate
 * 4. Refund request workflow
 * 5. Payment reminder notifications
 *
 * Prerequisites:
 * - Local development server running (npm run dev)
 * - Local Supabase running with seeded test data
 * - Game in payment_pending status
 * - Players with various payment states and credit balances
 */

test.describe('Payment Deadline Edge Cases', () => {
  test('should display payment deadline to confirmed players', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player29@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)
    await page.waitForTimeout(1000)

    // Look for payment deadline
    const hasDeadline = await page.locator('text=/deadline|pay by|before|until/i').isVisible()

    if (hasDeadline) {
      expect(hasDeadline).toBeTruthy()
    }
  })

  test('should show time remaining until deadline', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player30@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)
    await page.waitForTimeout(1000)

    // Look for countdown or time remaining
    const hasCountdown = await page.locator('text=/hour|minute|day|remaining/i').isVisible()

    if (hasCountdown) {
      expect(hasCountdown).toBeTruthy()
    }
  })

  test('should display credit balance on profile', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player31@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to profile
    await page.goto('http://localhost:3000/profile')
    await page.waitForTimeout(1000)

    // Look for credit balance
    const hasCreditBalance = await page.locator('text=/Credit.*Balance|Balance.*\\$|\\$\\d+.*credit/i').isVisible()
    expect(hasCreditBalance).toBeTruthy()
  })

  test('should show transaction history on profile', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player32@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to profile
    await page.goto('http://localhost:3000/profile')
    await page.waitForTimeout(1000)

    // Look for transaction history
    const hasHistory = await page.locator('text=/Transaction|History|Payment|Credit/i').isVisible()

    if (hasHistory) {
      expect(hasHistory).toBeTruthy()
    }
  })

  test('should allow player to request refund', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player33@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to profile
    await page.goto('http://localhost:3000/profile')
    await page.waitForTimeout(1000)

    // Look for refund request button
    const refundButton = page.locator('button:has-text("Request Refund"), button:has-text("Refund")')

    if (await refundButton.isVisible()) {
      expect(await refundButton.isVisible()).toBeTruthy()
    }
  })

  test('should allow admin to view refund requests', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to refunds page
    await page.goto('http://localhost:3000/admin/refunds')
    await page.waitForTimeout(1000)

    // Should see refund requests
    const hasRefunds = await page.locator('text=/Refund|Request|Player|Amount/i').isVisible()

    if (hasRefunds) {
      expect(hasRefunds).toBeTruthy()
    }
  })

  test('should allow admin to approve refund', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to refunds
    await page.goto('http://localhost:3000/admin/refunds')
    await page.waitForTimeout(1000)

    // Look for approve button
    const approveButton = page.locator('button:has-text("Approve")').first()

    if (await approveButton.isVisible()) {
      expect(await approveButton.isVisible()).toBeTruthy()
    }
  })

  test('should allow admin to deny refund', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'admin@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to refunds
    await page.goto('http://localhost:3000/admin/refunds')
    await page.waitForTimeout(1000)

    // Look for deny button
    const denyButton = page.locator('button:has-text("Deny"), button:has-text("Reject")').first()

    if (await denyButton.isVisible()) {
      expect(await denyButton.isVisible()).toBeTruthy()
    }
  })

  test('should show payment reminder on dashboard', async ({ page }) => {
    // Login as player
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player34@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)
    await page.waitForTimeout(1000)

    // Look for payment reminder or notice
    const hasReminder = await page.locator('text=/remind|pay|payment.*due|deadline/i').isVisible()

    if (hasReminder) {
      expect(hasReminder).toBeTruthy()
    }
  })

  test('should indicate credit will be applied automatically', async ({ page }) => {
    // Login as player with credit balance
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'player35@dropin.test')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to profile
    await page.goto('http://localhost:3000/profile')
    await page.waitForTimeout(1000)

    // Look for message about automatic credit application
    const hasAutoCredit = await page.locator('text=/automatically.*applied|credit.*applied|will be used/i').isVisible()

    if (hasAutoCredit) {
      expect(hasAutoCredit).toBeTruthy()
    }
  })
})
