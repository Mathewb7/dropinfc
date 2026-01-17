'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StrikeSettings {
  strikes_before_cooldown: number
  cooldown_weeks: number
}

const DEFAULT_SETTINGS: StrikeSettings = {
  strikes_before_cooldown: 3,
  cooldown_weeks: 3,
}

interface UseStrikeSettingsReturn {
  strikeSettings: StrikeSettings
  loading: boolean
}

/**
 * Hook to fetch strike system settings from the database
 * Returns default settings if fetch fails or no settings exist
 */
export function useStrikeSettings(): UseStrikeSettingsReturn {
  const [strikeSettings, setStrikeSettings] = useState<StrikeSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStrikeSettings(): Promise<void> {
      const supabase = createClient()

      try {
        const { data, error } = await supabase
          .from('strike_settings')
          .select('strikes_before_cooldown, cooldown_weeks')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('Failed to fetch strike settings:', error)
          return
        }

        if (data) {
          setStrikeSettings(data)
        }
      } catch (err) {
        console.error('Failed to fetch strike settings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStrikeSettings()
  }, [])

  return { strikeSettings, loading }
}
