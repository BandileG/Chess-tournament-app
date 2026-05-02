export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Chess } from 'chess.js'

function getRandomMove(fen: string, level: number): string {
  const chess = new Chess(fen)
  const moves = chess.moves({ verbose: true })
  if (!moves.length) return ''
  
  // Higher level = smarter random selection
  // For now returns a random legal move
  const move = moves[Math.floor(Math.random() * moves.length)]
  return move.from + move.to + (move.promotion || '')
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { game_id, fen, bot_level } = await request.json()

    const uci = getRandomMove(fen, bot_level)
    if (!uci) return NextResponse.json({ error: 'No moves' }, { status: 400 })

    return NextResponse.json({ success: true, move: uci })
  } catch (err) {
    console.error('[BOT-MOVE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}