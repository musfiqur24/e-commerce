import { NextRequest, NextResponse } from 'next/server'
import { backendCheckout, checkoutCustomer } from '@/lib/checkout-server'

export async function POST(req: NextRequest) {
  try {
    const customer = await checkoutCustomer()
    const body = await req.json()
    if (!body || !['prepare', 'payment', 'complete', 'status'].includes(body.action)) {
      return NextResponse.json({ error: 'Invalid checkout action' }, { status: 400 })
    }
    const { data, status } = await backendCheckout({ ...body, customer_id: customer.id })
    return NextResponse.json(data, { status })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout is unavailable'
    return NextResponse.json({ error: message === 'UNAUTHORIZED' ? 'Please sign in' : message }, { status: message === 'UNAUTHORIZED' ? 401 : 400 })
  }
}

export async function GET() {
  const key = process.env.STRIPE_PUBLISHABLE_KEY
  return NextResponse.json({ publishable_key: key || null }, { headers: { 'Cache-Control': 'no-store' } })
}
