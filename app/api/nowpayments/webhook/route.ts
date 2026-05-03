export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-nowpayments-sig') || ''

    // Verify webhook signature
    const hmac = crypto
      .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!)
      .update(rawBody)
      .digest('hex')

    if (hmac !== signature) {
      console.error('Invalid NOWPayments webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    // Only process confirmed/finished payments
    if (!['confirmed', 'finished'].includes(payload.payment_status)) {
      return NextResponse.json({ ok: true })
    }

    const orderRef: string = payload.order_id
    const amount: number = parseFloat(payload.price_amount || '0')

    if (!orderRef || !amount) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Find pending transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference_id', orderRef)
      .eq('reference_type', 'nowpayments')
      .single()

    if (!transaction) {
      console.error('Transaction not found:', orderRef)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Prevent double processing
    if (transaction.balance_after !== null) {
      return NextResponse.json({ ok: true })
    }

    const userId = transaction.user_id

    // Get current balance
    const { data: userData } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .single()

    const currentBalance = userData?.wallet_balance ?? 0
    const newBalance = currentBalance + amount

    // Update wallet balance
    await supabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', userId)

    // Update wallets table
    await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    // Mark transaction complete
    await supabase
      .from('transactions')
      .update({
        balance_before: currentBalance,
        balance_after: newBalance,
      })
      .eq('reference_id', orderRef)

    console.log(`✅ Crypto deposit credited: $${amount} to user ${userId}`)

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('NOWPayments webhook error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
