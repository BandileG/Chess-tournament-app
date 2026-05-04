// ============================================================
// EXPERT BOTS — ELO 1200 to 1500
// Stockfish Level: 11–13
// Delay: 6000–20000ms
// ============================================================

import type { BotProfile } from '@/lib/bots/types'
import { getTier } from '@/lib/bots/types'

const RAW = [
  {
    id: 'bot_kingslayer_mag',
    name: 'KingSlayer_Mag',
    flag: '🇳🇴', country: 'NO', elo: 1340,
    avatar: '👑', avatar_url: undefined,
    bio: 'Your king is already dead. You just don\'t know it yet.',
    delay: [6000, 18000] as [number, number],
    stockfishLevel: 12,
  },
  {
    id: 'bot_queenhunter_fati',
    name: 'QueenHunter_Fati',
    flag: '🇲🇦', country: 'MA', elo: 1460,
    avatar: '♛', avatar_url: undefined,
    bio: 'I take queens for breakfast',
    delay: [7000, 20000] as [number, number],
    stockfishLevel: 13,
  },
  {
    id: 'bot_cashandmate_chase',
    name: 'CashAndMate_Chase',
    flag: '🇺🇸', country: 'US', elo: 1420,
    avatar: '💰', avatar_url: undefined,
    bio: 'Checkmate pays my bills. Every time.',
    delay: [7000, 19000] as [number, number],
    stockfishLevel: 12,
  },
  {
    id: 'bot_nomercy_ivan',
    name: 'NoMercy_Ivan',
    flag: '🇷🇺', country: 'RU', elo: 1380,
    avatar: '⚔️', avatar_url: undefined,
    bio: 'Mercy is not in my opening theory',
    delay: [6500, 18000] as [number, number],
    stockfishLevel: 12,
  },
  {
    id: 'bot_boarddominator_ade',
    name: 'BoardDominator_Ade',
    flag: '🇳🇬', country: 'NG', elo: 1300,
    avatar: '♔', avatar_url: undefined,
    bio: 'Lagos to London. I dominate everywhere.',
    delay: [6000, 17000] as [number, number],
    stockfishLevel: 11,
  },

  // ── ADD MORE EXPERT BOTS BELOW ──
]

export const EXPERT_BOTS: BotProfile[] = RAW.map(b => ({
  ...b, tier: getTier(b.elo)
}))
