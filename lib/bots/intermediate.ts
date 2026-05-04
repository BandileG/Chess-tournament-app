// ============================================================
// INTERMEDIATE BOTS — ELO 300 to 500
// Stockfish Level: 3–4
// Delay: 3000–9000ms
// ============================================================

import type { BotProfile } from '@/lib/bots/types'
import { getTier } from '@/lib/bots/types'
const RAW = [
  {
    id: 'bot_dirhams_omar',
    name: 'DirhamsOnBoard',
    flag: '🇦🇪', country: 'AE', elo: 370,
    avatar: '♝', avatar_url: undefined,
    bio: 'Every move is an investment',
    delay: [3000, 8000] as [number, number],
    stockfishLevel: 3,
  },
  {
    id: 'bot_queensgambit_sof',
    name: 'QueensGambit_Sof',
    flag: '🇪🇸', country: 'ES', elo: 440,
    avatar: '♛', avatar_url: undefined,
    bio: 'Accept my gambit. I dare you.',
    delay: [4000, 9000] as [number, number],
    stockfishLevel: 4,
  },
  {
    id: 'bot_pawnsacrifice_ko',
    name: 'PawnSacrifice_Ko',
    flag: '🇰🇷', country: 'KR', elo: 480,
    avatar: '♟', avatar_url: undefined,
    bio: 'I will give up a pawn to take your soul',
    delay: [3500, 8500] as [number, number],
    stockfishLevel: 4,
  },
  {
    id: 'bot_middlegame_mo',
    name: 'MiddleGame_Mo',
    flag: '🇲🇦', country: 'MA', elo: 420,
    avatar: '♞', avatar_url: undefined,
    bio: 'The middlegame is where I shine',
    delay: [3500, 8000] as [number, number],
    stockfishLevel: 3,
  },

  // ── ADD MORE INTERMEDIATE BOTS BELOW ──
]

export const INTERMEDIATE_BOTS: BotProfile[] = RAW.map(b => ({
  ...b, tier: getTier(b.elo)
}))