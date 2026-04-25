export type TransactionType = 'deposit' | 'withdrawal' | 'entry' | 'winning' | 'refund'
export type TournamentFormat = 'bullet' | 'blitz' | 'rapid'
export type TournamentStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type MatchStatus = 'waiting' | 'active' | 'completed' | 'abandoned'
export type MatchResult = 'white' | 'black' | 'draw' | 'timeout' | 'forfeit'
export type PlayerStatus = 'active' | 'eliminated' | 'winner'
export type PieceColor = 'white' | 'black'

export interface User {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  rating: number
  wins: number
  losses: number
  draws: number
  total_earnings: number
  created_at: string
  updated_at: string
}

export interface Wallet {
  id: string
  user_id: string
  balance: number
  total_deposited: number
  total_withdrawn: number
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  balance_before: number
  balance_after: number
  reference_id: string | null
  reference_type: string | null
  description: string | null
  created_at: string
}

export interface Tournament {
  id: string
  name: string
  format: TournamentFormat
  time_control: number
  increment: number
  entry_fee: number
  prize_pool: number
  max_players: number
  current_players: number
  status: TournamentStatus
  rounds_total: number
  rounds_completed: number
  starts_at: string | null
  ended_at: string | null
  created_at: string
}

export interface TournamentPlayer {
  id: string
  tournament_id: string
  user_id: string
  status: PlayerStatus
  score: number
  prize_earned: number
  joined_at: string
  user?: User
}

export interface Match {
  id: string
  tournament_id: string | null
  round_number: number | null
  white_player_id: string
  black_player_id: string
  status: MatchStatus
  winner_id: string | null
  result: MatchResult | null
  current_fen: string
  white_time_remaining: number
  black_time_remaining: number
  time_control: number
  increment: number
  move_count: number
  last_move_at: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  white_player?: User
  black_player?: User
}

export interface Move {
  id: string
  match_id: string
  player_id: string
  move_san: string
  move_uci: string
  fen_after: string
  move_number: number
  color: PieceColor
  time_spent_ms: number
  white_time_after: number
  black_time_after: number
  created_at: string
}
