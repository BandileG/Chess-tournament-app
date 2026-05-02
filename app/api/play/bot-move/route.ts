export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Chess } from 'chess.js'

function getBestMove(fen: string, level: number): string {
  const chess = new Chess(fen)
  const moves = chess.moves({ verbose: true })
  if (!moves.length) return ''

  const scored = moves.map(move => {
    let score = Math.random() * (20 - level)
    if (move.captured) score += 10
    if (move.flags.includes('p')) score += 5
    chess.move(move)
    if (chess.isCheck()) score += 3
    if (chess.isCheckmate()) score += 1000
    chess.undo()
    return { move, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const topN = Math.max(1, Math.floor(moves.length / level))
  const best = scored.slice(0, topN)
  const picked = best[Math.floor(Math.random() * best.length)]

  const m = picked.move
  return m.from + m.to + (m.promotion || '')
}

export async function POST(request: Request) {
  try {
    const { fen, bot_level } = await request.json()
    const uci = getBestMove(fen, bot_level)
    if (!uci) return NextResponse.json({ error: 'No moves' }, { status: 400 })
    return NextResponse.json({ success: true, move: uci })
  } catch (err) {
    console.error('[BOT-MOVE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}