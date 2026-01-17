// TypeScript types for DropIn FC Database Schema
// Auto-generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'player' | 'admin' | 'super_admin'
export type GameStatus = 'priority_open' | 'waitlist_open' | 'payment_pending' | 'teams_assigned' | 'completed' | 'cancelled'
export type PlayerGameStatus = 'priority_invited' | 'priority_confirmed' | 'priority_declined' | 'waitlist' | 'lottery_selected' | 'confirmed' | 'withdrawn' | 'removed_nonpayment'
export type PaymentStatus = 'pending' | 'marked_paid' | 'verified' | 'unpaid' | 'credited'
export type TeamName = 'dark' | 'light'
export type PositionType = 'field' | 'sub' | 'keeper'
export type CreditTransactionType = 'credit_added' | 'credit_used' | 'refund_requested' | 'refund_completed'
export type RefundStatus = 'pending' | 'approved' | 'denied'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          whatsapp_name: string | null
          is_permanent_keeper: boolean
          skill_rating: number | null
          credit_balance: number
          withdrawal_strikes: number
          strike_cooldown_until: string | null
          total_games_played: number
          times_started_as_sub: number
          times_started_as_keeper: number
          weeks_since_last_played: number
          role: UserRole
          is_active: boolean
          profile_picture_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          whatsapp_name?: string | null
          is_permanent_keeper?: boolean
          skill_rating?: number | null
          credit_balance?: number
          withdrawal_strikes?: number
          strike_cooldown_until?: string | null
          total_games_played?: number
          times_started_as_sub?: number
          times_started_as_keeper?: number
          weeks_since_last_played?: number
          role?: UserRole
          is_active?: boolean
          profile_picture_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          whatsapp_name?: string | null
          is_permanent_keeper?: boolean
          skill_rating?: number | null
          credit_balance?: number
          withdrawal_strikes?: number
          strike_cooldown_until?: string | null
          total_games_played?: number
          times_started_as_sub?: number
          times_started_as_keeper?: number
          weeks_since_last_played?: number
          role?: UserRole
          is_active?: boolean
          profile_picture_url?: string | null
          created_at?: string
        }
      }
      games: {
        Row: {
          id: string
          game_date: string
          status: GameStatus
          priority_deadline: string
          payment_reminder_time: string
          payment_deadline: string
          sunday_lottery_deadline: string
          teams_announced: boolean
          created_at: string
        }
        Insert: {
          id?: string
          game_date: string
          status?: GameStatus
          priority_deadline: string
          payment_reminder_time: string
          payment_deadline: string
          sunday_lottery_deadline: string
          teams_announced?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          game_date?: string
          status?: GameStatus
          priority_deadline?: string
          payment_reminder_time?: string
          payment_deadline?: string
          sunday_lottery_deadline?: string
          teams_announced?: boolean
          created_at?: string
        }
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          status: PlayerGameStatus
          payment_status: PaymentStatus
          team: TeamName | null
          position: PositionType | null
          is_starting: boolean | null
          joined_waitlist_at: string | null
          confirmed_at: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          status: PlayerGameStatus
          payment_status?: PaymentStatus
          team?: TeamName | null
          position?: PositionType | null
          is_starting?: boolean | null
          joined_waitlist_at?: string | null
          confirmed_at?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          status?: PlayerGameStatus
          payment_status?: PaymentStatus
          team?: TeamName | null
          position?: PositionType | null
          is_starting?: boolean | null
          joined_waitlist_at?: string | null
          confirmed_at?: string | null
          paid_at?: string | null
          created_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          player_id: string
          game_id: string | null
          amount: number
          type: CreditTransactionType
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          game_id?: string | null
          amount: number
          type: CreditTransactionType
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          game_id?: string | null
          amount?: number
          type?: CreditTransactionType
          notes?: string | null
          created_at?: string
        }
      }
      refund_requests: {
        Row: {
          id: string
          player_id: string
          game_id: string
          amount: number
          status: RefundStatus
          admin_notes: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          player_id: string
          game_id: string
          amount: number
          status?: RefundStatus
          admin_notes?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          player_id?: string
          game_id?: string
          amount?: number
          status?: RefundStatus
          admin_notes?: string | null
          created_at?: string
          resolved_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      weighted_lottery_selection: {
        Args: {
          p_game_id: string
          p_spots_available: number
        }
        Returns: {
          player_id: string
          weight: number
        }[]
      }
      balance_teams: {
        Args: {
          p_game_id: string
        }
        Returns: {
          player_id: string
          assigned_team: TeamName
          assigned_position: PositionType
          is_starting: boolean
        }[]
      }
      update_weeks_since_last_played: {
        Args: Record<string, never>
        Returns: void
      }
      get_waitlist_position: {
        Args: {
          p_game_id: string
          p_player_id: string
        }
        Returns: number
      }
      can_join_game: {
        Args: {
          p_player_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      game_status: GameStatus
      player_game_status: PlayerGameStatus
      payment_status: PaymentStatus
      team_name: TeamName
      position_type: PositionType
      credit_transaction_type: CreditTransactionType
      refund_status: RefundStatus
    }
  }
}

// Helper types for common queries
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Game = Database['public']['Tables']['games']['Row']
export type GameInsert = Database['public']['Tables']['games']['Insert']
export type GameUpdate = Database['public']['Tables']['games']['Update']

export type GamePlayer = Database['public']['Tables']['game_players']['Row']
export type GamePlayerInsert = Database['public']['Tables']['game_players']['Insert']
export type GamePlayerUpdate = Database['public']['Tables']['game_players']['Update']

export type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row']
export type CreditTransactionInsert = Database['public']['Tables']['credit_transactions']['Insert']
export type CreditTransactionUpdate = Database['public']['Tables']['credit_transactions']['Update']

export type RefundRequest = Database['public']['Tables']['refund_requests']['Row']
export type RefundRequestInsert = Database['public']['Tables']['refund_requests']['Insert']
export type RefundRequestUpdate = Database['public']['Tables']['refund_requests']['Update']

// Extended types with relations
export type GameWithPlayers = Game & {
  game_players: (GamePlayer & {
    player: Profile
  })[]
}

export type ProfileWithStats = Profile & {
  game_players?: GamePlayer[]
  credit_transactions?: CreditTransaction[]
}

export type GamePlayerWithProfile = GamePlayer & {
  player: Profile
}
