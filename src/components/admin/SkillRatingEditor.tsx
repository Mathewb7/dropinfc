'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillRatingEditorProps {
  playerId: string
  currentRating: number | null
  onUpdate?: () => void
}

export function SkillRatingEditor({ playerId, currentRating, onUpdate }: SkillRatingEditorProps) {
  const [rating, setRating] = useState(currentRating || 0)
  const [hover, setHover] = useState(0)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleRatingClick = async (newRating: number) => {
    setLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ skill_rating: newRating })
        .eq('id', playerId)

      if (error) throw error

      setRating(newRating)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Failed to update rating:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={loading}
          onClick={() => handleRatingClick(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              star <= (hover || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            )}
          />
        </button>
      ))}
    </div>
  )
}
