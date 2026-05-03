// ============================================================
// AMATEUR BOTS — ELO 0 to 150
// Stockfish Level: 1
// Delay: 1000–5000ms
// ============================================================

import type { BotProfile } from './types'
import { getTier } from './types'

const RAW = [
  {
    id: 'bot_pawnpusher_alex',
    name: 'PawnPusher_Alex',
    flag: '🇺🇸', country: 'US', elo: 110,
    avatar: '♙', avatar_url: undefined,
    bio: 'Still learning but I play every day',
    delay: [1500, 4500] as [number, number],
    stockfishLevel: 1,
  },
  {
    id: 'bot_queendreamer_pri',
    name: 'QueenDreamer_Pri',
    flag: '🇮🇳', country: 'IN', elo: 135,
    avatar: '♛', avatar_url: undefined,
    bio: 'One day I will be grandmaster. Not today.',
    delay: [1800, 5000] as [number, number],
    stockfishLevel: 1,
  },
  {
    id: 'bot_newbie_jake',
    name: 'NewbieMoves_Jake',
    flag: '🇨🇦', country: 'CA', elo: 90,
    avatar: '♟', avatar_url: undefined,
    bio: 'I just learned how knights move last week',
    delay: [1000, 4000] as [number, number],
    stockfishLevel: 1,
  },
  {
    id: 'bot_firstmove_lena',
    name: 'FirstMove_Lena',
    flag: '🇦🇺', country: 'AU', elo: 120,
    avatar: '♙', avatar_url: undefined,
    bio: 'e4 is always my answer',
    delay: [1200, 4200] as [number, number],
    stockfishLevel: 1,
  },

  // ── ADD MORE AMATEUR BOTS BELOW ──
]

export const AMATEUR_BOTS: BotProfile[] = RAW.map(b => ({
  ...b, tier: getTier(b.elo)
}))