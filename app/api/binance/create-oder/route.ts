export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const BINANCE_API = 'https://bpay.binanceapi.com'

function generateSignature(nonce: string, timestamp: string, body: string) {
  const payload = `${timestamp}\n${nonce}\n${body}\n`
  return crypto
    .createHmac('sha512', process.env.BINANCE_PAY_SECRET_KEY!)
    .update(payload)
    .digest('hex')
    .toUpperCase()
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { amount } = await req.json()
    if (!amount || amount < 5) {
      return NextResponse.json({ error: 'Minimum deposit is $5' }, { status: 400 })
    }

    const nonce = crypto.randomBytes(16).toString('hex').toUpperCase()
    const timestamp = Date.now().toString()
    const merchantTradeNo = `BS${timestamp}${user.id.slice(0, 8).toUpperCase()}`

    const body = JSON.stringify({
      env: { terminalType: 'WEB' },
      merchantTradeNo,
      orderAmount: amount.toFixed(2),
      currency: 'USDT',
      goods: {
        goodsType: '02',
        goodsCategory: 'Z000',
        referenceGoodsId: 'wallet-deposit',
        goodsName: 'Blitzstake Wallet Deposit',
        goodsDetail: `Deposit $${amount.toFixed(2)} to Blitzstake wallet`,
      },
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?deposit=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?deposit=cancelled`,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/binance/webhook`,
    })

    const signature = generateSignature(nonce, timestamp, body)

    const res = await fetch(`${BINANCE_API}/binancepay/openapi/v2/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'BinancePay-Timestamp': timestamp,
        'BinancePay-Nonce': nonce,
        'BinancePay-Certificate-SN': process.env.BINANCE_PAY_API_KEY!,
        'BinancePay-Signature': signature,
      },
      body,
    })

    const data = await res.json()

    if (data.status !== 'SUCCESS') {
      console.error('Binance Pay error:', data)
      return NextResponse.json({ error: 'Failed to create Binance Pay order' }, { status: 400 })
    }

    // Save pending transaction in Supabase
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount,
      description: `Binance Pay deposit — ${merchantTradeNo}`,
      reference_id: merchantTradeNo,
      reference_type: 'binance_pay',
    })

    return NextResponse.json({
      checkoutUrl: data.data.checkoutUrl,
      merchantTradeNo,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
