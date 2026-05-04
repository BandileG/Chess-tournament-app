// ============================================================
// PRO BOTS — ELO 500 to 800
// Stockfish Level: 5–6
// Delay: 4000–13000ms
// ============================================================

import type { BotProfile } from '@/lib/bots/types'
import { getTier } from '@/lib/bots/types'
const RAW = [
  {
    id: 'bot_pawnstorm_viktor',
    name: 'PawnStorm_Viktor',
    flag: '🇷🇺', country: 'RU', elo: 610,
    avatar: '♟', avatar_url: undefined,
    bio: 'Your king has nowhere to run',
    delay: [4000, 11000] as [number, number],
    stockfishLevel: 5,
  },
  {
    id: 'bot_boardboss_kwame',
    name: 'BoardBoss_Kwame',
    flag: '🇬🇭', country: 'GH', elo: 740,
    avatar: '♚', avatar_url: undefined,
    bio: 'From Accra to the top of the board',
    delay: [5000, 12000] as [number, number],
    stockfishLevel: 6,
  },
  {
    id: 'bot_nairaking_tunde',
    name: 'NairaKing_Tunde',
    flag: '🇳🇬', country: 'NG', elo: 780,
    avatar: '♔', avatar_url: undefined,
    bio: 'Cash and checkmate. That is all.',
    delay: [5000, 13000] as [number, number],
    stockfishLevel: 6,
  },
  {
    id: 'bot_castlebreaker_jay',
    name: 'CastleBreaker_Jay',
    flag: '🇺🇸', country: 'US', elo: 720,
    avatar: '♜', avatar_url: undefined,
    bio: 'Your castles are just obstacles to me',
    delay: [4500, 11000] as [number, number],
    stockfishLevel: 6,
  },
  {
    id: 'bot_randking_sa',
    name: 'RandKing_SA',
    flag: '🇿🇦', country: 'ZA', elo: 760,
    avatar: '♔', avatar_url: undefined,
    bio: 'Cape Town chess hits different',
    delay: [5000, 12000] as [number, number],
    stockfishLevel: 6,
  },

  // ── ADD MORE PRO BOTS BELOW ──
]

export const PRO_BOTS: BotProfile[] = RAW.map(b => ({
  ...b, tier: getTier(b.elo)
}))