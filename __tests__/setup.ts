import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.test file for integration tests
config({ path: resolve(__dirname, '../.env.test') })

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock environment variables for unit tests (will be overridden by .env.test for integration)
if (!process.env.TEST_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
}
