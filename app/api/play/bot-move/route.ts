export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { Chess } from 'chess.js'
import { getThinkingDelay, getBotForElo, BOTS } from '@/lib/bots'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
  try {
    const { fen, bot_level, bot_id, move_number, user_elo } = await request.json()

    // Find bot profile
    const bot = bot_id
      ? BOTS.find(b => b.id === bot_id) || getBotForElo(user_elo || 800)
      : getBotForElo(user_elo || 800)

    // Human-like thinking delay
    const delay = getThinkingDelay(bot, move_number || 1)
    await sleep(delay)

    // Get Stockfish move
    const depth = Math.min(bot.stockfishLevel, 18)
    const res = await fetch(
      `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${depth}`
    )
    const data = await res.json()

    if (data.success && data.bestmove) {
      const uci = data.bestmove.replace('bestmove ', '').split(' ')[0]
      return NextResponse.json({ success: true, move: uci, bot })
    }

    // Fallback to random move
    const chess = new Chess(fen)
    const moves = chess.moves({ verbose: true })
    const move = moves[Math.floor(Math.random() * moves.length)]
    const uci = move.from + move.to + (move.promotion || '')
    return NextResponse.json({ success: true, move: uci, bot })

  } catch (err) {
    console.error('[BOT-MOVE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}