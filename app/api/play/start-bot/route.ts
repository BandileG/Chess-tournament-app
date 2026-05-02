export const dynamic = 'force-dynamic'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function getBotLevel(rating: number): number {
  if (rating < 800)  return 1
  if (rating < 1000) return 3
  if (rating < 1200) return 5
  if (rating < 1400) return 8
  if (rating < 1600) return 12
  return 16
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { game_id } = await request.json()

    const { data: user } = await supabase
      .from('users')
      .select('rating')
      .eq('id', session.user.id)
      .single()

    const botLevel = getBotLevel(user?.rating ?? 1200)

    const { data: game } = await supabase
      .from('casual_games')
      .update({
        status: 'active',
        is_vs_bot: true,
        bot_level: botLevel,
        started_at: new Date().toISOString(),
      })
      .eq('id', game_id)
      .eq('white_player_id', session.user.id)
      .select()
      .single()

    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: { game, bot_level: botLevel } })
  } catch (err) {
    console.error('[START-BOT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}