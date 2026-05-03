export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import crypto from 'crypto'

function verifySignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string
): boolean {
  const payload = `${timestamp}\n${nonce}\n${body}\n`
  const expected = crypto
    .createHmac('sha512', process.env.BINANCE_PAY_SECRET_KEY!)
    .update(payload)
    .digest('hex')
    .toUpperCase()
  return expected === signature
}

export async function POST(req: NextRequest) {
  try {
    const timestamp = req.headers.get('BinancePay-Timestamp') || ''
    const nonce = req.headers.get('BinancePay-Nonce') || ''
    const signature = req.headers.get('BinancePay-Signature') || ''
    const rawBody = await req.text()

    // Verify webhook is really from Binance
    if (!verifySignature(timestamp, nonce, rawBody, signature)) {
      console.error('Invalid Binance webhook signature')
      return NextResponse.json({ returnCode: 'FAIL', returnMessage: 'Invalid signature' })
    }

    const payload = JSON.parse(rawBody)

    // Only process successful payments
    if (payload.bizType !== 'PAY' || payload.bizStatus !== 'PAY_SUCCESS') {
      return NextResponse.json({ returnCode: 'SUCCESS', returnMessage: null })
    }

    const merchantTradeNo: string = payload.data?.merchantTradeNo
    const amount: number = parseFloat(payload.data?.orderAmount || '0')

    if (!merchantTradeNo || !amount) {
      return NextResponse.json({ returnCode: 'FAIL', returnMessage: 'Missing data' })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Find the pending transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference_id', merchantTradeNo)
      .eq('reference_type', 'binance_pay')
      .single()

    if (!transaction) {
      console.error('Transaction not found:', merchantTradeNo)
      return NextResponse.json({ returnCode: 'FAIL', returnMessage: 'Transaction not found' })
    }

    // Prevent double processing
    if (transaction.balance_after !== null) {
      return NextResponse.json({ returnCode: 'SUCCESS', returnMessage: null })
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
        total_deposited: supabase.rpc('increment', { x: amount }),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    // Mark transaction as complete
    await supabase
      .from('transactions')
      .update({
        balance_before: currentBalance,
        balance_after: newBalance,
      })
      .eq('reference_id', merchantTradeNo)

    console.log(`✅ Binance deposit credited: $${amount} to user ${userId}`)

    return NextResponse.json({ returnCode: 'SUCCESS', returnMessage: null })

  } catch (err) {
    console.error('Binance webhook error:', err)
    return NextResponse.json({ returnCode: 'FAIL', returnMessage: 'Server error' })
  }
}
