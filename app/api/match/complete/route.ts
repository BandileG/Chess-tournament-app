import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { match_id, winner_id, result, tournament_id } = await request.json()

    if (!match_id) return NextResponse.json({ error: 'Missing match_id' }, { status: 400 })

    // Update match as completed
    const { error: matchError } = await supabase
      .from('matches')
      .update({
        status: 'completed',
        winner_id: winner_id ?? null,
        result: result ?? 'draw',
        ended_at: new Date().toISOString(),
      })
      .eq('id', match_id)

    if (matchError) {
      console.error('[MATCH UPDATE]', matchError)
      return NextResponse.json({ error: matchError.message }, { status: 500 })
    }

    // Advance tournament round
    if (tournament_id) {
      const { error: advanceError } = await supabase.rpc('advance_tournament_round', {
        p_tournament_id: tournament_id
      })
      if (advanceError) console.error('[ADVANCE]', advanceError)

      // Check if tournament completed → payout
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('status')
        .eq('id', tournament_id)
        .single()

      if (tournament?.status === 'completed') {
        await supabase.rpc('process_tournament_payout', {
          p_tournament_id: tournament_id
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[COMPLETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}