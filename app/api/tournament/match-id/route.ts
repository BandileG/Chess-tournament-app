import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const tournament_id = searchParams.get('tournament_id')
    const user_id = searchParams.get('user_id')

    if (!tournament_id || !user_id) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    // Find the match this player is in
    const { data, error } = await supabase
      .from('matches')
      .select('id, round_number, white_player_id, black_player_id, status')
      .eq('tournament_id', tournament_id)
      .or(`white_player_id.eq.${user_id},black_player_id.eq.${user_id}`)
      .eq('status', 'active')
      .order('round_number', { ascending: true })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'No active match found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[MATCH-ID]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
