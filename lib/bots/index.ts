// ============================================================
// BLITZSTAKE BOTS — MAIN EXPORT
// ============================================================

export type { BotProfile, BotTier } from './types'
export { 
  getTier, 
  getThinkingDelay,
  evaluateMaterial,
  shouldBotResign,
  OPENING_BOOK,
} from './types'

import { AMATEUR_BOTS } from './amateur'
import { BEGINNER_BOTS } from './beginner'
import { INTERMEDIATE_BOTS } from './intermediate'
import { PRO_BOTS } from './pro'
import { LEGEND_BOTS } from './legend'
import { EXPERT_BOTS } from './expert'
import { GRANDMONSTER_BOTS } from './grandmonster'
import type { BotProfile, BotTier } from './types'

export const BOTS: BotProfile[] = [
  ...AMATEUR_BOTS,
  ...BEGINNER_BOTS,
  ...INTERMEDIATE_BOTS,
  ...PRO_BOTS,
  ...LEGEND_BOTS,
  ...EXPERT_BOTS,
  ...GRANDMONSTER_BOTS,
]

export function getBotForElo(userElo: number): BotProfile {
  return BOTS.reduce((prev, curr) =>
    Math.abs(curr.elo - userElo) < Math.abs(prev.elo - userElo) ? curr : prev
  )
}

export function getRandomBotForElo(userElo: number): BotProfile {
  const range = BOTS.filter(b => Math.abs(b.elo - userElo) <= 200)
  if (range.length === 0) return getBotForElo(userElo)
  return range[Math.floor(Math.random() * range.length)]
}

export function getBotsByTier(tier: BotTier): BotProfile[] {
  return BOTS.filter(b => b.tier === tier)
}
