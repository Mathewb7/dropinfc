import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatGameDate,
  formatTime,
  timeUntil,
  formatCurrency,
} from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn()', () => {
    it('should merge class names', () => {
      expect(cn('px-2 py-1', 'bg-blue-500')).toBe('px-2 py-1 bg-blue-500')
    })

    it('should handle Tailwind class conflicts correctly', () => {
      // Last class should win
      expect(cn('px-2', 'px-4')).toBe('px-4')
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      expect(cn('base-class', isActive && 'active')).toBe('base-class active')
      expect(cn('base-class', !isActive && 'active')).toBe('base-class')
    })

    it('should handle arrays and objects', () => {
      expect(cn(['px-2', 'py-1'], { 'bg-blue-500': true, 'text-white': false })).toBe(
        'px-2 py-1 bg-blue-500'
      )
    })
  })

  describe('formatGameDate()', () => {
    it('should format a Date object correctly', () => {
      const date = new Date('2026-01-20')
      const formatted = formatGameDate(date)
      expect(formatted).toContain('January')
      expect(formatted).toContain('2026')
    })

    it('should format a string date correctly', () => {
      const formatted = formatGameDate('2026-01-20')
      expect(formatted).toContain('January')
      expect(formatted).toContain('20')
      expect(formatted).toContain('2026')
    })

    it('should include weekday in format', () => {
      const formatted = formatGameDate('2026-01-20')
      // Check that it includes a weekday (Tuesday)
      expect(formatted).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/)
    })
  })

  describe('formatTime()', () => {
    it('should format time with AM/PM', () => {
      const date = new Date('2026-01-20T14:30:00')
      const formatted = formatTime(date)
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i)
    })

    it('should handle string dates', () => {
      const formatted = formatTime('2026-01-20T09:00:00')
      expect(formatted).toMatch(/9:00\s?AM/i)
    })

    it('should format afternoon times correctly', () => {
      const formatted = formatTime('2026-01-20T20:30:00')
      expect(formatted).toMatch(/8:30\s?PM/i)
    })
  })

  describe('timeUntil()', () => {
    beforeEach(() => {
      // Mock Date.now() to return a fixed time
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-15T10:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "Expired" for past dates', () => {
      const pastDate = new Date('2026-01-14T10:00:00Z')
      expect(timeUntil(pastDate)).toBe('Expired')
    })

    it('should format days and hours correctly', () => {
      const futureDate = new Date('2026-01-17T15:00:00Z')
      const result = timeUntil(futureDate)
      expect(result).toContain('day')
      expect(result).toContain('hour')
    })

    it('should format hours and minutes correctly', () => {
      const futureDate = new Date('2026-01-15T15:30:00Z')
      const result = timeUntil(futureDate)
      expect(result).toContain('hour')
      expect(result).toContain('minute')
    })

    it('should format just minutes for very soon deadlines', () => {
      const futureDate = new Date('2026-01-15T10:30:00Z')
      const result = timeUntil(futureDate)
      expect(result).toContain('minute')
      expect(result).not.toContain('hour')
      expect(result).not.toContain('day')
    })

    it('should handle singular vs plural correctly', () => {
      // 1 day
      const oneDayFuture = new Date('2026-01-16T10:00:00Z')
      expect(timeUntil(oneDayFuture)).toContain('1 day')

      // 2 days
      const twoDaysFuture = new Date('2026-01-17T10:00:00Z')
      expect(timeUntil(twoDaysFuture)).toContain('2 days')
    })

    it('should handle string dates', () => {
      const result = timeUntil('2026-01-17T10:00:00Z')
      expect(result).toContain('day')
    })
  })

  describe('formatCurrency()', () => {
    it('should format positive amounts correctly', () => {
      expect(formatCurrency(15)).toBe('$15.00')
      expect(formatCurrency(30)).toBe('$30.00')
    })

    it('should format decimal amounts', () => {
      expect(formatCurrency(15.5)).toBe('$15.50')
      expect(formatCurrency(15.99)).toBe('$15.99')
    })

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle large amounts', () => {
      const formatted = formatCurrency(1000)
      expect(formatted).toContain('1,000')
    })
  })
})
