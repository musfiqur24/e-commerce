import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Use the Stripe checkout at /api/checkout.' }, { status: 410 })
}
