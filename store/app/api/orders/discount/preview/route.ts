import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Discounts are calculated by /api/checkout when preparing an order.' }, { status: 410 })
}
