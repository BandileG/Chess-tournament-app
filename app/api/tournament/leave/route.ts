import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { tournament_id, user_id } = await req.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get tournament entry fee
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('entry_fee')
    .eq('id', tournament_id)
    .single()

  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  // Remove from tournament_players
  await supabase
    .from('tournament_players')
    .delete()
    .eq('tournament_id', tournament_id)
    .eq('user_id', user_id)

  // Refund wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', user_id)
    .single()

  const newBalance = (wallet?.balance ?? 0) + tournament.entry_fee

  await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('user_id', user_id)

  // Log refund transaction
  await supabase
    .from('transactions')
    .insert({
      user_id,
      type: 'refund',
      amount: tournament.entry_fee,
      balance_before: wallet?.balance,
      balance_after: newBalance,
      reference_id: tournament_id,
      reference_type: 'tournament',
      description: 'Queue cancelled — entry fee refunded',
    })

  return NextResponse.json({ success: true, refunded: tournament.entry_fee })
                            }
