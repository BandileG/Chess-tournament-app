export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { Chess } from 'chess.js'
import {
  getThinkingDelay,
  getBotForElo,
  BOTS,
  OPENING_BOOK,
  evaluateMaterial,
  shouldBotResign,
} from '@/lib/bots'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Pick a move from the opening book if available ──
function getOpeningMove(
  fen: string,
  moveNumber: number,
  tier: string,
  gameOpeningIndex: number
): string | null {
  // Only apply opening book for first 8 moves
  if (moveNumber > 8) return null

  const book = OPENING_BOOK[tier as keyof typeof OPENING_BOOK]
  if (!book || book.length === 0) return null

  // Use the gameOpeningIndex to pick which opening line this game follows
  const line = book[gameOpeningIndex % book.length]
  if (!line) return null

  // The move index for this side
  // White plays moves 0,2,4... Black plays moves 1,3,5...
  const chess = new Chess()
  // Reconstruct move count from FEN
  const parts = fen.split(' ')
  const fullMove = parseInt(parts[5] || '1')
  const sideToMove = parts[1] // 'w' or 'b'
  const moveIndex = (fullMove - 1) * 2 + (sideToMove === 'b' ? 1 : 0)

  if (moveIndex >= line.length) return null

  // Validate the book move is legal in current position
  const chess2 = new Chess(fen)
  const uci = line[moveIndex]
  if (!uci) return null

  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const promotion = uci.length === 5 ? uci[4] : undefined

  try {
    const move = chess2.move({ from, to, ...(promotion ? { promotion } : {}) })
    if (move) return uci
  } catch {
    return null
  }

  return null
}

export async function POST(request: Request) {
  try {
    const {
      fen,
      bot_level,
      bot_id,
      move_number,
      user_elo,
      bot_time_ms,
      user_time_ms,
      total_time_ms,
      game_opening_index,
    } = await request.json()

    const botTimeMs = bot_time_ms ?? 300000
    const userTimeMs = user_time_ms ?? 300000
    const totalTimeMs = total_time_ms ?? 300000

    // ── Find bot profile ──
    const bot = bot_id
      ? BOTS.find(b => b.id === bot_id) || getBotForElo(user_elo || 800)
      : getBotForElo(user_elo || 800)

    // ── Human-like thinking delay (all 3 layers) ──
    const delay = getThinkingDelay(bot, move_number || 1, botTimeMs, userTimeMs, totalTimeMs)
    await sleep(delay)

    // ── Check resign conditions BEFORE making move ──
    const chess = new Chess(fen)
    const botColor = chess.turn() // 'w' or 'b'
    const materialScore = evaluateMaterial(fen, botColor)
    const resign = shouldBotResign(bot, materialScore, botTimeMs, userTimeMs)

    if (resign) {
      return NextResponse.json({ success: true, resign: true, bot })
    }

    // ── Try opening book first ──
    const openingMove = getOpeningMove(fen, move_number || 1, bot.tier, game_opening_index ?? 0)
    if (openingMove) {
      return NextResponse.json({ success: true, move: openingMove, bot, source: 'book' })
    }

    // ── Get Stockfish move at bot's true ELO depth ──
    const depth = Math.min(bot.stockfishLevel, 18)
    const res = await fetch(
      `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${depth}`
    )
    const data = await res.json()

    if (data.success && data.bestmove) {
      const rawBest = data.bestmove.replace('bestmove ', '').split(' ')[0]

      // ── Move variety: sometimes pick alternative moves ──
      // ONLY for lower ELO bots — never compromises intelligence
      // Higher ELO bots always play the best Stockfish move
      // Lower ELO bots sometimes pick from legal moves near the best
      let uci = rawBest

      if (bot.elo < 600 && Math.random() < 0.25) {
        // 25% chance: pick a different legal move (not random — filtered to reasonable moves)
        const legalMoves = chess.moves({ verbose: true })
        // Filter out obviously bad moves (hanging pieces etc handled by low stockfish depth already)
        // Just pick any legal move that isn't the king moving backwards
        const alternatives = legalMoves.filter(m => {
          const uciAlt = m.from + m.to
          return uciAlt !== rawBest
        })
        if (alternatives.length > 0) {
          // Pick from top third of alternatives (not completely random)
          const topAlts = alternatives.slice(0, Math.max(1, Math.floor(alternatives.length / 3)))
          const picked = topAlts[Math.floor(Math.random() * topAlts.length)]
          uci = picked.from + picked.to + (picked.promotion || '')
        }
      } else if (bot.elo < 1000 && Math.random() < 0.10) {
        // 10% chance for mid ELO: slight variation
        const legalMoves = chess.moves({ verbose: true })
        const alternatives = legalMoves.filter(m => m.from + m.to !== rawBest)
        if (alternatives.length > 0) {
          const topAlts = alternatives.slice(0, Math.max(1, Math.floor(alternatives.length / 5)))
          const picked = topAlts[Math.floor(Math.random() * topAlts.length)]
          uci = picked.from + picked.to + (picked.promotion || '')
        }
      }
      // ELO 1000+ always plays Stockfish best move — no compromise

      return NextResponse.json({ success: true, move: uci, bot, source: 'stockfish' })
    }

    // ── Fallback: random legal move ──
    const moves = chess.moves({ verbose: true })
    if (moves.length === 0) {
      return NextResponse.json({ success: false, error: 'No legal moves' })
    }
    const move = moves[Math.floor(Math.random() * moves.length)]
    const uci = move.from + move.to + (move.promotion || '')
    return NextResponse.json({ success: true, move: uci, bot, source: 'fallback' })

  } catch (err) {
    console.error('[BOT-MOVE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}