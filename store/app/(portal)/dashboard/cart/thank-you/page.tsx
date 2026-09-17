'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import PageContainer from '@/components/portal/PageContainer'
import { useCart } from '@/context/CartContext'
import { checkoutRequest, type CheckoutResult } from '@/lib/checkout'
import { formatBdt } from '@/lib/currency'

export default function ThankYouPage() {
  const { consumeOrder } = useCart()
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [error, setError] = useState('')
  const started = useRef(false)
  useEffect(() => {
    const cartId = new URLSearchParams(window.location.search).get('cart_id')
    if (!cartId) {
      const timer = setTimeout(() => setError('No checkout reference was supplied. Please check your orders.'), 0)
      return () => clearTimeout(timer)
    }
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    const check = async () => {
      try {
        const action = started.current ? 'status' : 'complete'
        started.current = true
        const response = await checkoutRequest({ action, cart_id: cartId })
        if (!active) return
        setResult(response)
        if (response.status === 'canceled') { setError('This order was canceled. Check your orders for details.'); return }
        if (response.status === 'paid') {
          if (sessionStorage.getItem('portal:pending-cart') === cartId) {
            consumeOrder(response.order?.items ?? []); sessionStorage.removeItem('portal:pending-cart')
          }
          setError(''); return
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to confirm order yet')
      }
      if (active && ++attempts < 20) timer = setTimeout(check, 3000)
      else if (active) setError('Confirmation is taking longer than usual. Check your orders or contact the store before paying again.')
    }
    void check()
    return () => { active = false; clearTimeout(timer) }
  }, [consumeOrder])

  return <PageContainer breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Order confirmation' }]}>
    <div className="mx-auto max-w-2xl space-y-5 rounded-lg border bg-white p-8">
      <h1 className="text-2xl font-semibold">{result?.status === 'paid' ? 'Thank you! Your order is confirmed.' : result?.status === 'canceled' ? 'Order canceled' : 'Confirming your order'}</h1>
      {error && <p role="alert" className="text-amber-700">{error}</p>}
      {result?.status !== 'paid' && result?.status !== 'canceled' && <p>We are checking the payment and order status. Please do not submit another payment.</p>}
      {result?.order && <>
        <p>Order #{result.order.display_id}</p>
        {result.order.items.map(item => <div key={item.id} className="flex justify-between border-b py-2">
          <span>{item.title} {item.variant_title && `(${item.variant_title})`} × {item.quantity}</span>
          <span>{formatBdt(Number(item.unit_price) * item.quantity)}</span>
        </div>)}
        <p className="font-semibold">Total: {formatBdt(Number(result.order.total))}</p>
      </>}
      <div className="flex gap-5"><Link className="underline" href="/dashboard/orders">View orders</Link><Link className="underline" href="/dashboard/marketplace">Continue shopping</Link></div>
    </div>
  </PageContainer>
}
