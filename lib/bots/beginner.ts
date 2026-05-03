// ============================================================
// BEGINNER BOTS — ELO 150 to 300
// Stockfish Level: 2
// Delay: 2000–7000ms
// ============================================================

import type { BotProfile } from './types'
import { getTier } from './types'

const RAW = [
  {
    id: 'bot_realkingcarlos',
    name: 'RealKing_Carlos',
    flag: '🇧🇷', country: 'BR', elo: 210,
    avatar: '♚', avatar_url: undefined,
    bio: 'Money on the board, money in the bank',
    delay: [2000, 6000] as [number, number],
    stockfishLevel: 2,
  },
  {
    id: 'bot_silentrook_yuki',
    name: 'SilentRook_Yuki',
    flag: '🇯🇵', country: 'JP', elo: 270,
    avatar: '♜', avatar_url: undefined,
    bio: 'I speak through my pieces. Quietly.',
    delay: [3000, 7000] as [number, number],
    stockfishLevel: 2,
  },
  {
    id: 'bot_checkhunter_mike',
    name: 'CheckHunter_Mike',
    flag: '🇬🇧', country: 'GB', elo: 290,
    avatar: '♞', avatar_url: undefined,
    bio: 'My knight is coming for your king',
    delay: [2500, 6500] as [number, number],
    stockfishLevel: 2,
  },
  {
    id: 'bot_pawngrabber_tom',
    name: 'PawnGrabber_Tom',
    flag: '🇺🇸', country: 'US', elo: 180,
    avatar: '♙', avatar_url: undefined,
    bio: 'Every pawn I take brings me closer to winning',
    delay: [2000, 6000] as [number, number],
    stockfishLevel: 2,
  },

  // ── ADD MORE BEGINNER BOTS BELOW ──
]

export const BEGINNER_BOTS: BotProfile[] = RAW.map(b => ({
  ...b, tier: getTier(b.elo)
}))