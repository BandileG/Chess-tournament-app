export const dynamic = 'force-dynamic'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { tournament_id } = await request.json()

    // Generate bracket — pairs all 10 players into matches
    const { error } = await supabase.rpc('generate_bracket', {
      p_tournament_id: tournament_id
    })

    if (error) {
      console.error('[START]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[START]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
