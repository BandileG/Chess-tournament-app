// ============================================================
// GRANDMONSTER BOTS — ELO 1500 to 2500
// Stockfish Level: 16–20
// Delay: 8000–32000ms
// ============================================================

import type { BotProfile } from './types'
import { getTier } from './types'

const RAW = [
  {
    id: 'bot_ironrook_dmitri',
    name: 'IronRook_Dmitri',
    flag: '🇷🇺', country: 'RU', elo: 1750,
    avatar: '♜', avatar_url: undefined,
    bio: 'No mercy. No draws. No escape.',
    delay: [8000, 25000] as [number, number],
    stockfishLevel: 16,
  },
  {
    id: 'bot_ruthlessrook_ana',
    name: 'RuthlessRook_Ana',
    flag: '🇧🇷', country: 'BR', elo: 1850,
    avatar: '♜', avatar_url: undefined,
    bio: 'Ruthless is not a choice. It is a lifestyle.',
    delay: [9000, 26000] as [number, number],
    stockfishLevel: 17,
  },
  {
    id: 'bot_yourkingisdead',
    name: 'YourKingIsDead',
    flag: '🇩🇪', country: 'DE', elo: 2050,
    avatar: '💀', avatar_url: undefined,
    bio: 'I announce checkmate before I play it',
    delay: [10000, 28000] as [number, number],
    stockfishLevel: 18,
  },
  {
    id: 'bot_checkmateking_x',
    name: 'CheckMate_KingX',
    flag: '🇺🇸', country: 'US', elo: 2200,
    avatar: '♔', avatar_url: undefined,
    bio: 'You cannot prepare for what I have planned',
    delay: [11000, 30000] as [number, number],
    stockfishLevel: 19,
  },
  {
    id: 'bot_grandmonster_chen',
    name: 'GrandMonster_Chen',
    flag: '🇨🇳', country: 'CN', elo: 2400,
    avatar: '👹', avatar_url: undefined,
    bio: 'I have never lost a winning position. Ever.',
    delay: [12000, 32000] as [number, number],
    stockfishLevel: 20,
  },

  // ── ADD MORE GRANDMONSTER BOTS BELOW ──
]

export const GRANDMONSTER_BOTS: BotProfile[] = RAW.map(b => ({
  ...b, tier: getTier(b.elo)
}))