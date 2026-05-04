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
  avatar_url?: string
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

// ============================================================
// OPENING BOOKS PER TIER
// Each entry is a sequence of UCI moves the bot may play
// ============================================================
export const OPENING_BOOK: Record<BotTier, string[][]> = {
  Amateur: [
    ['e2e4', 'e7e5', 'g1f3'],
    ['d2d4', 'd7d5'],
    ['e2e4', 'd7d5'],
    ['e2e4', 'e7e6'],
    ['f2f4'],
    ['g2g4'],
    ['b2b4'],
  ],
  Beginner: [
    ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
    ['d2d4', 'd7d5', 'c2c4'],
    ['e2e4', 'c7c5'],
    ['e2e4', 'e7e6', 'd2d4'],
    ['d2d4', 'g8f6', 'c2c4'],
    ['e2e4', 'd7d6'],
  ],
  Intermediate: [
    ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],       // Ruy Lopez
    ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4'],        // Sicilian
    ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3'],        // QGD
    ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3'],        // French
    ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'g1f3'],        // Nimzo
    ['c2c4'],                                           // English
  ],
  Pro: [
    ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6'], // Najdorf
    ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4'], // Ruy Lopez main
    ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7'], // Kings Indian
    ['d2d4', 'd7d5', 'c2c4', 'c7c6', 'g1f3', 'g8f6'],  // Slav
    ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1d2'],           // French Tarrasch
    ['c2c4', 'e7e5', 'b1c3', 'g8f6', 'g1f3'],           // English
  ],
  Legend: [
    ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6', 'f2f3'], // Najdorf English Attack
    ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7', 'e2e4', 'd7d6', 'g1f3'], // KID classical
    ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'd2d4', 'e5d4', 'f3d4'],                  // Scotch
    ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1g5'],                  // QGD classical
    ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4'],                  // Caro-Kann
  ],
  Expert: [
    ['e2e4', 'c7c5', 'g1f3', 'b8c6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'd7d6', 'f1c4'], // Sozin
    ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'g1f3', 'b7b6', 'g2g3'],                                   // Queens Indian
    ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1'], // Ruy Lopez with castling
    ['d2d4', 'f7f5', 'g2g3', 'g8f6', 'f1g2', 'e7e6'],                           // Dutch
    ['e2e4', 'd7d6', 'd2d4', 'g8f6', 'b1c3', 'g7g6', 'f2f4'],                  // Pirc Austrian
  ],
  Grandmonster: [
    ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6', 'f1e2', 'e7e5', 'd4f3'], // Najdorf Scheveningen
    ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7', 'e2e4', 'd7d6', 'g1f3', 'e8g8', 'f1e2', 'e7e5'],         // KID main line
    ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3', 'f8b4', 'e4e5', 'c7c5', 'a2a3'],                                   // French Winawer
    ['d2d4', 'd7d5', 'c2c4', 'c7c6', 'b1c3', 'g8f6', 'e2e3', 'e7e6', 'g1f3', 'a7a6'],                          // Meran
    ['e2e4', 'c7c5', 'b1c3', 'b8c6', 'g2g3', 'g7g6', 'f1g2', 'f8g7'],                                           // Closed Sicilian
  ],
}

// ============================================================
// HUMAN-LIKE THINKING DELAY
// 3 layers: base randomness + time gap pressure + low clock panic
// botTimeMs and userTimeMs are in milliseconds
// totalTimeMs is the game's starting time in milliseconds
// ============================================================
export function getThinkingDelay(
  bot: BotProfile,
  moveNumber: number,
  botTimeMs: number = 300000,
  userTimeMs: number = 300000,
  totalTimeMs: number = 300000
): number {
  const [min, max] = bot.delay

  // ── LAYER 1: Base randomness — varies naturally throughout game ──
  let base: number
  if (moveNumber <= 3) {
    // Opening: quick moves
    base = Math.random() * 1200 + 300
  } else if (moveNumber <= 10) {
    // Early middlegame: moderate thinking
    base = Math.random() * (max - min) * 0.7 + min
  } else if (moveNumber <= 20) {
    // Deep middlegame: longest think
    base = Math.random() * (max - min) + min
    // Occasional long think (15% chance)
    if (Math.random() < 0.15) base *= 1.8
    // Occasional quick move (10% chance)
    if (Math.random() < 0.10) base = min * 0.4
  } else {
    // Endgame: varied, sometimes very fast, sometimes slow
    base = Math.random() * (max - min) * 0.8 + min * 0.5
    if (Math.random() < 0.20) base = min * 0.3
  }

  // ── LAYER 2: Time gap pressure ──
  // If bot has significantly less time than user, speed up
  const timeDiffMs = userTimeMs - botTimeMs
  const twoMins30 = 150000 // 2m30s in ms
  const oneMin = 60000

  let gapMultiplier = 1.0
  if (timeDiffMs >= twoMins30) {
    // Losing by 2m30s+ → noticeably faster
    const gapRatio = Math.min(timeDiffMs / totalTimeMs, 0.8)
    gapMultiplier = 1.0 - gapRatio * 0.6 // up to 60% faster
  } else if (timeDiffMs >= oneMin) {
    // Losing by 1 min → slightly faster
    gapMultiplier = 0.85
  }

  // ── LAYER 3: Low clock panic ──
  // Scales based on total time control, not fixed seconds
  const tenPercent = totalTimeMs * 0.10  // under 10% of total time
  const twentyPercent = totalTimeMs * 0.20 // under 20% of total time

  let panicMultiplier = 1.0
  if (botTimeMs < tenPercent) {
    // Critical — near instant
    panicMultiplier = 0.15
  } else if (botTimeMs < twentyPercent) {
    // Panic — much faster
    panicMultiplier = 0.35
  } else if (botTimeMs < totalTimeMs * 0.33) {
    // Worried — faster than normal
    panicMultiplier = 0.65
  }

  // Use the most aggressive multiplier between gap and panic
  const finalMultiplier = Math.min(gapMultiplier, panicMultiplier)
  const finalDelay = Math.floor(base * finalMultiplier)

  // Never go below 200ms (always looks like it's thinking)
  return Math.max(finalDelay, 200)
}

// ============================================================
// MATERIAL EVALUATION — for resign logic
// Returns material score from bot's perspective (negative = bot losing)
// ============================================================
export function evaluateMaterial(fen: string, botColor: 'w' | 'b'): number {
  const pieceValues: Record<string, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
  }

  const board = fen.split(' ')[0]
  let score = 0

  for (const char of board) {
    if (char === '/' || /\d/.test(char)) continue
    const isWhite = char === char.toUpperCase()
    const piece = char.toLowerCase()
    const value = pieceValues[piece] || 0
    if ((isWhite && botColor === 'w') || (!isWhite && botColor === 'b')) {
      score += value
    } else {
      score -= value
    }
  }

  return score // negative means bot is losing material
}

// ============================================================
// BOT RESIGN DECISION
// Only resigns when BOTH: losing on time AND losing material
// 50% chance even then — not always
// Threshold scales with ELO
// ============================================================
export function shouldBotResign(
  bot: BotProfile,
  materialScore: number,   // negative = bot losing
  botTimeMs: number,
  userTimeMs: number
): boolean {
  // Must be losing on time (user has more time)
  const losingOnTime = userTimeMs > botTimeMs + 30000 // user has 30s+ more

  if (!losingOnTime) return false

  // Material threshold based on ELO — higher ELO fights longer
  let resignThreshold: number
  if (bot.elo < 300) {
    resignThreshold = -6  // down ~queen (9) or rook+minor (8) — resigns easier
  } else if (bot.elo < 600) {
    resignThreshold = -8  // down queen or equivalent
  } else if (bot.elo < 1000) {
    resignThreshold = -10 // down queen + pawn
  } else if (bot.elo < 1400) {
    resignThreshold = -13 // down queen + minor piece
  } else {
    resignThreshold = -16 // nearly impossible — top bots fight to the end
  }

  const losingMaterial = materialScore <= resignThreshold

  if (!losingMaterial) return false

  // 50/50 coin flip — not always resigns even when conditions are met
  return Math.random() < 0.5
} 
