export const dynamic = 'force-dynamic'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getBotForElo } from '@/lib/bots'

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

    const userElo = user?.rating ?? 800
    const bot = getBotForElo(userElo)

    const { data: game } = await supabase
      .from('casual_games')
      .update({
        status: 'active',
        is_vs_bot: true,
        bot_level: bot.stockfishLevel,
        bot_id: bot.id,
        bot_name: bot.name,
        bot_flag: bot.flag,
        bot_elo: bot.elo,
        bot_avatar: bot.avatar,
        bot_bio: bot.bio,
        started_at: new Date().toISOString(),
      })
      .eq('id', game_id)
      .eq('white_player_id', session.user.id)
      .select()
      .single()

    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    return NextResponse.json({
      success: true,
      data: { game, bot_level: bot.stockfishLevel, bot }
    })
  } catch (err) {
    console.error('[START-BOT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}