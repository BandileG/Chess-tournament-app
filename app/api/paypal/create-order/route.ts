import { NextRequest, NextResponse } from 'next/server'

const PAYPAL_API = 'https://api-m.sandbox.paypal.com'

async function getAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_SECRET

  if (!clientId || !secret) {
    throw new Error(`Missing credentials - clientId: ${!!clientId}, secret: ${!!secret}`)
  }

  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64')

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json()

  if (!data.access_token) {
    throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`)
  }

  return data.access_token
}

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json()
    const accessToken = await getAccessToken()

    const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amount.toFixed(2),
            },
            description: 'Blitzstake Wallet Deposit',
          },
        ],
        application_context: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paypal/capture`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet`,
        },
      }),
    })

    const order = await res.json()
    const approvalUrl = order.links?.find((l: { rel: string }) => l.rel === 'approve')?.href

    if (!approvalUrl) {
      return NextResponse.json({ error: `No approval URL - order: ${JSON.stringify(order)}` }, { status: 400 })
    }

    return NextResponse.json({ approvalUrl })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
