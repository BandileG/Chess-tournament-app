export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const NOWPAYMENTS_API = 'https://api.nowpayments.io/v1'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { amount } = await req.json()
    if (!amount || amount < 5) {
      return NextResponse.json({ error: 'Minimum deposit is $5' }, { status: 400 })
    }

    const orderRef = `BS-${Date.now()}-${user.id.slice(0, 8)}`

    const res = await fetch(`${NOWPAYMENTS_API}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: 'usd',
        pay_currency: 'usdtbsc',
        order_id: orderRef,
        order_description: 'Blitzstake Wallet Deposit',
        ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/nowpayments/webhook`,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?deposit=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?deposit=cancelled`,
      }),
    })

    const data = await res.json()

    if (!data.invoice_url) {
      console.error('NOWPayments error:', data)
      return NextResponse.json({ error: 'Failed to create crypto payment' }, { status: 400 })
    }

    // Save pending transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount,
      description: `Crypto deposit — ${orderRef}`,
      reference_id: orderRef,
      reference_type: 'nowpayments',
    })

    return NextResponse.json({
      invoiceUrl: data.invoice_url,
      orderRef,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
