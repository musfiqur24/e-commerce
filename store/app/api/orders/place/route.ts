import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Direct order placement is disabled. Use /api/orders/pay.' },
    { status: 410 }
  )
}
