import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  buildOrderPreview,
  getAuthenticatedCustomer,
  type CartItemInput,
} from '../../_lib/place-order'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let customer: Awaited<ReturnType<typeof getAuthenticatedCustomer>>
  try {
    customer = await getAuthenticatedCustomer()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'NOT_AUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message === 'CUSTOMER_NOT_FOUND') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to verify customer' }, { status: 500 })
  }

  const body = await req.json()
  const { items, discountCode } = body as {
    items: CartItemInput[]
    discountCode?: string
  }

  if (!discountCode?.trim()) {
    return NextResponse.json(
      { error: 'Enter a discount code' },
      { status: 400 }
    )
  }

  try {
    const preview = await buildOrderPreview(items, discountCode, {
      contactEmail: customer.email,
    })

    return NextResponse.json({
      discount: preview.discount,
      totals: {
        subtotal: preview.subtotal,
        shipping: preview.shipping,
        total: preview.total,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Discount failed'
    const lowered = message.toLowerCase()
    const status =
      message === 'Cart is empty'
        ? 400
        : lowered.includes('discount')
          ? 400
          : lowered.includes('not available') || lowered.includes('no price')
            ? 409
            : 500

    return NextResponse.json({ error: message }, { status })
  }
}
