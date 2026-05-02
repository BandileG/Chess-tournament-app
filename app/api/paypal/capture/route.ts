export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const PAYPAL_API = 'https://api-m.sandbox.paypal.com'

async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString('base64')

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/wallet?error=missing_token`)
  }

  const accessToken = await getAccessToken()

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${token}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const capture = await res.json()
  const amount = parseFloat(
    capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0'
  )

  if (amount > 0) {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user.id)
        .single()

      const newBalance = (userData?.wallet_balance || 0) + amount

      await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id)
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/wallet?success=true`)
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/wallet?error=payment_failed`)
}
