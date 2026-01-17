/**
 * Application-wide constants
 * Centralizes all magic numbers and strings
 */

export const GAME_CONFIG = {
  LOCATION: 'Windsor Bubble North Vancouver',
  DAY_OF_WEEK: 'Tuesday',
  START_TIME: '20:30',
  END_TIME: '22:00',
  TOTAL_PLAYERS: 16,
  PLAYERS_PER_TEAM: 8,
  FIELD_PLAYERS_PER_TEAM: 4,
  SUBS_PER_TEAM: 3,
  KEEPERS_PER_TEAM: 1,
  PAYMENT_AMOUNT: 15, // Game cost per player
} as const

export const DEADLINES = {
  PRIORITY_WINDOW: 'Wednesday AM after game',
  PRIORITY_DEADLINE: 'Thursday 12:00 PM',
  SPOTS_OPEN: 'Thursday 12:00 PM (immediately after priority deadline)',
  PAYMENT_REMINDER: 'Saturday 12:00 PM',
  PAYMENT_DEADLINE: 'Saturday 11:59 PM',
  TEAMS_ANNOUNCEMENT: 'Monday PM',
} as const

export const STRIKE_SYSTEM = {
  STRIKES_FOR_COOLDOWN: 3,
  COOLDOWN_WEEKS: 2,
} as const

export const PAYMENT = {
  GAME_FEE: 15,
  REFUND_CREDIT_AMOUNT: 15,
} as const

export const TEAM_COLORS = {
  DARK: {
    name: 'Dark',
    bg: 'bg-gray-800',
    text: 'text-white',
    border: 'border-gray-800',
  },
  LIGHT: {
    name: 'Light',
    bg: 'bg-gray-100',
    text: 'text-gray-900',
    border: 'border-gray-300',
  },
} as const
