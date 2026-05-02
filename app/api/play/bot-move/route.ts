export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Chess } from 'chess.js'

export async function POST(request: Request) {
  try {
    const { fen, bot_level } = await request.json()

    // Use free Stockfish API
    const depth = Math.min(bot_level, 15)
    const res = await fetch(
      `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${depth}`
    )
    const data = await res.json()

    if (data.success && data.bestmove) {
      const uci = data.bestmove.replace('bestmove ', '').split(' ')[0]
      return NextResponse.json({ success: true, move: uci })
    }

    // Fallback to random move
    const chess = new Chess(fen)
    const moves = chess.moves({ verbose: true })
    const move = moves[Math.floor(Math.random() * moves.length)]
    const uci = move.from + move.to + (move.promotion || '')
    return NextResponse.json({ success: true, move: uci })

  } catch (err) {
    console.error('[BOT-MOVE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}