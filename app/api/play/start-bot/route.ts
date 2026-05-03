export const dynamic = 'force-dynamic'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { BOTS, getTier } from '@/lib/bots'

function getRandomBotForElo(userElo: number) {
  // Get all bots within a reasonable ELO range of the user
  const range = 200
  const candidates = BOTS.filter(
    b => Math.abs(b.elo - userElo) <= range
  )

  // If no candidates in range, widen to same tier
  if (candidates.length === 0) {
    const tier = getTier(userElo)
    const tierBots = BOTS.filter(b => b.tier === tier)
    if (tierBots.length > 0) {
      return tierBots[Math.floor(Math.random() * tierBots.length)]
    }
    // Last resort: any bot
    return BOTS[Math.floor(Math.random() * BOTS.length)]
  }

  // Pick randomly from candidates
  return candidates[Math.floor(Math.random() * candidates.length)]
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

    const userElo = user?.rating ?? 800

    // Pick a RANDOM bot near user ELO — different every game
    const bot = getRandomBotForElo(userElo)

    // Pick a random opening line index for this game
    // This is stored so bot-move can follow the same opening line throughout
    const gameOpeningIndex = Math.floor(Math.random() * 20)

    const { data: game, error } = await supabase
      .from('casual_games')
      .update({
        status: 'active',
        is_vs_bot: true,
        black_player_id: session.user.id,
        bot_level: bot.stockfishLevel,
        bot_id: bot.id,
        bot_name: bot.name,
        bot_flag: bot.flag,
        bot_elo: bot.elo,
        bot_avatar: bot.avatar,
        bot_bio: bot.bio,
        game_opening_index: gameOpeningIndex,
        started_at: new Date().toISOString(),
      })
      .eq('id', game_id)
      .select()
      .single()

    if (error || !game) {
      console.error('[START-BOT] update error:', error)
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { game, bot_level: bot.stockfishLevel, bot, game_opening_index: gameOpeningIndex }
    })
  } catch (err) {
    console.error('[START-BOT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}