// ============================================================
// LEGEND BOTS — ELO 800 to 1200
// Stockfish Level: 8–9
// Delay: 5000–17000ms
// ============================================================

import type { BotProfile } from './types'
import { getTier } from './types'

const RAW = [
  {
    id: 'bot_dragonrook_lin',
    name: 'DragonRook_Lin',
    flag: '🇨🇳', country: 'CN', elo: 940,
    avatar: '♜', avatar_url: undefined,
    bio: 'Patience is my deadliest weapon',
    delay: [5000, 15000] as [number, number],
    stockfishLevel: 8,
  },
  {
    id: 'bot_rupeerook_arjun',
    name: 'RupeeRook_Arjun',
    flag: '🇮🇳', country: 'IN', elo: 1090,
    avatar: '♝', avatar_url: undefined,
    bio: 'I calculate 10 moves ahead. Minimum.',
    delay: [6000, 16000] as [number, number],
    stockfishLevel: 9,
  },
  {
    id: 'bot_bloodonboard_chen',
    name: 'BloodOnBoard_Chen',
    flag: '🇨🇳', country: 'CN', elo: 1150,
    avatar: '♛', avatar_url: undefined,
    bio: 'There will be blood. On the board.',
    delay: [6000, 17000] as [number, number],
    stockfishLevel: 9,
  },
  {
    id: 'bot_elothief_felix',
    name: 'EloThief_Felix',
    flag: '🇩🇪', country: 'DE', elo: 1000,
    avatar: '♞', avatar_url: undefined,
    bio: 'I came for your ELO points',
    delay: [5500, 14000] as [number, number],
    stockfishLevel: 8,
  },

  // ── ADD MORE LEGEND BOTS BELOW ──
]

export const LEGEND_BOTS: BotProfile[] = RAW.map(b => ({
  ...b, tier: getTier(b.elo)
}))