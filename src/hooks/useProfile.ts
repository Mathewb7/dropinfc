'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>
}

/**
 * Hook to fetch and manage the current user's profile
 */
export function useProfile(userId: string | undefined): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchProfile = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) {
      return { error: 'No user ID provided' }
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (updateError) throw updateError

      // Refetch to get updated data
      await fetchProfile()

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update profile' }
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [userId])

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
  }
}
