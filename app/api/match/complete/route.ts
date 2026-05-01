import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { match_id, winner_id, result } = await request.json()

    // Get match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Update match as completed
    await supabase.from('matches').update({
      status: 'completed',
      winner_id,
      result,
      ended_at: new Date().toISOString(),
    }).eq('id', match_id)

    // Update winner stats
    await supabase.from('users')
      .update({ wins: supabase.rpc('increment', { x: 1 }) })
      .eq('id', winner_id)

    // Update loser stats
    const loser_id = match.white_player_id === winner_id
      ? match.black_player_id
      : match.white_player_id

    await supabase.from('users')
      .update({ losses: supabase.rpc('increment', { x: 1 }) })
      .eq('id', loser_id)

    // Try to advance tournament round
    if (match.tournament_id) {
      const { error: advanceError } = await supabase.rpc('advance_tournament_round', {
        p_tournament_id: match.tournament_id
      })

      if (advanceError) {
        console.error('[ADVANCE]', advanceError)
      }

      // Check if tournament is now completed → trigger payout
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('status')
        .eq('id', match.tournament_id)
        .single()

      if (tournament?.status === 'completed') {
        await supabase.rpc('process_tournament_payout', {
          p_tournament_id: match.tournament_id
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[COMPLETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
