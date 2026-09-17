export interface CheckoutCart {
  id: string
  currency_code: string
  total: number
  subtotal: number
  shipping_total: number
  tax_total: number
  discount_total: number
}

export interface CheckoutResult {
  cart?: CheckoutCart
  shipping_options?: Array<{ id: string; name: string; amount?: number }>
  client_secret?: string
  status?: 'pending' | 'processing' | 'paid' | 'canceled'
  order?: CheckoutCart & { display_id: number; items: Array<{ id: string; variant_id?: string; title: string; variant_title?: string; quantity: number; unit_price: number }> }
}

export async function checkoutRequest(body: Record<string, unknown>): Promise<CheckoutResult> {
  const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Checkout failed. Please try again.')
  return result
}
