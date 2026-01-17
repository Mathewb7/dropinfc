import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines CSS classes intelligently, merging Tailwind classes properly
 * Example: cn("px-2 py-1", "px-4") => "px-4 py-1" (last px wins)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

function toDate(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count !== 1 ? 's' : ''}`
}

/**
 * Formats a date to "Tuesday, January 14, 2026"
 * Handles date-only strings (YYYY-MM-DD) as local dates to avoid timezone shifts
 */
export function formatGameDate(date: Date | string): string {
  let dateObj: Date

  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Date-only string (YYYY-MM-DD) - parse as local date to avoid timezone shift
    const [year, month, day] = date.split('-').map(Number)
    dateObj = new Date(year, month - 1, day)
  } else {
    dateObj = toDate(date)
  }

  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Formats a datetime to "12:00 PM"
 */
export function formatTime(date: Date | string): string {
  return toDate(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const MS_PER_MINUTE = 1000 * 60
const MS_PER_HOUR = MS_PER_MINUTE * 60
const MS_PER_DAY = MS_PER_HOUR * 24

/**
 * Calculates time remaining until a deadline
 * Returns: "2 days, 5 hours" or "5 hours, 30 minutes" or "Expired"
 */
export function timeUntil(deadline: Date | string): string {
  const diff = toDate(deadline).getTime() - Date.now()

  if (diff < 0) return "Expired"

  const days = Math.floor(diff / MS_PER_DAY)
  const hours = Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR)
  const minutes = Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE)

  if (days > 0) return `${pluralize(days, 'day')}, ${pluralize(hours, 'hour')}`
  if (hours > 0) return `${pluralize(hours, 'hour')}, ${pluralize(minutes, 'minute')}`
  return pluralize(minutes, 'minute')
}

/**
 * Formats currency: 15 => "$15.00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)
}
