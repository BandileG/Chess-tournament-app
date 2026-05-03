// ============================================================
// BLITZSTAKE BOT TYPES & HELPERS
// ============================================================

export type BotTier =
  | 'Amateur'       // 0–150
  | 'Beginner'      // 150–300
  | 'Intermediate'  // 300–500
  | 'Pro'           // 500–800
  | 'Legend'        // 800–1200
  | 'Expert'        // 1200–1500
  | 'Grandmonster'  // 1500–2500

export interface BotProfile {
  id: string
  name: string
  flag: string
  country: string
  elo: number
  avatar: string
  avatar_url?: string  // set later: '/bots/filename.jpg'
  bio: string
  delay: [number, number]
  stockfishLevel: number
  tier: BotTier
}

export function getTier(elo: number): BotTier {
  if (elo < 150)  return 'Amateur'
  if (elo < 300)  return 'Beginner'
  if (elo < 500)  return 'Intermediate'
  if (elo < 800)  return 'Pro'
  if (elo < 1200) return 'Legend'
  if (elo < 1500) return 'Expert'
  return 'Grandmonster'
}

export function getThinkingDelay(bot: BotProfile, moveNumber: number): number {
  const [min, max] = bot.delay
  if (moveNumber <= 4) return Math.random() * 1500 + 400
  const base = Math.random() * (max - min) + min
  const longThink = Math.random() < 0.15 ? base * 1.8 : base
  const quickMove = Math.random() < 0.10 ? min * 0.3 : longThink
  return Math.floor(quickMove)
}