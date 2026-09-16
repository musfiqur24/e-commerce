import { NextResponse } from 'next/server'
import { getMedusaShippingProduct } from '@/lib/medusa'

// Fallback only used if the Medusa product with Type = "Shipping" can't be
// found — kept in sync with the same fallback in
// app/api/orders/_lib/place-order.ts so a lookup failure shows the same
// number here as would actually be charged at checkout.
const FALLBACK_SHIPPING_PRICE = 25

export async function GET() {
  try {
    const shippingProduct = await getMedusaShippingProduct()
    return NextResponse.json({
      price: shippingProduct?.price ?? FALLBACK_SHIPPING_PRICE,
    })
  } catch (err) {
    console.error('[shipping-fee] Failed to look up shipping product:', err)
    return NextResponse.json({ price: FALLBACK_SHIPPING_PRICE })
  }
}
