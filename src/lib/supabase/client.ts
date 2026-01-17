/**
 * Browser-side Supabase client
 * Use this in client components (marked with 'use client')
 */

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export a singleton instance for convenience
export const supabase = createClient()
