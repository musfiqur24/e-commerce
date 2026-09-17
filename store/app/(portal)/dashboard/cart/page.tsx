'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import PageContainer from '@/components/portal/PageContainer'
import CartItemCard from '@/components/portal/CartItemCard'
import StripePayment from '@/components/portal/StripePayment'
import { useCart } from '@/context/CartContext'
import { formatBdt } from '@/lib/currency'
import { checkoutRequest, type CheckoutResult } from '@/lib/checkout'

const addressFields = [
  ['first_name', 'First name'], ['last_name', 'Last name'], ['phone', 'Phone'],
  ['address_1', 'Address'], ['address_2', 'Apartment / building (optional)'],
  ['city', 'City'], ['province', 'District (optional)'], ['postal_code', 'Postal code'],
] as const

export default function CartPage() {
  const { cart, subtotal, updateQuantity, removeFromCart } = useCart()
  const [quote, setQuote] = useState<CheckoutResult | null>(null)
  const [shippingId, setShippingId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [resumeCart] = useState(() => typeof window === 'undefined' ? '' : sessionStorage.getItem('portal:pending-cart') || '')

  async function prepare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setBusy(true); setError('')
    try {
      const data = new FormData(event.currentTarget)
      const address = Object.fromEntries(addressFields.map(([key]) => [key, String(data.get(key) ?? '').trim()]))
      const result = await checkoutRequest({ action: 'prepare',
        items: cart.map(item => ({ variant_id: item.product.variantId, quantity: item.quantity })),
        address: { ...address, country_code: 'bd' },
        promo_code: String(data.get('promo_code') ?? '').trim(), delivery_notes: String(data.get('delivery_notes') ?? '').trim(),
      })
      if (!result.shipping_options?.length) throw new Error('No delivery option is available for this address. Please contact the store.')
      setQuote(result)
      setShippingId(result.shipping_options[0].id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to prepare checkout') }
    finally { setBusy(false); submitting.current = false }
  }

  async function startPayment() {
    if (!quote?.cart || submitting.current) return
    submitting.current = true
    setBusy(true); setError('')
    try {
      const result = await checkoutRequest({ action: 'payment', cart_id: quote.cart.id, shipping_option_id: shippingId })
      if (!result.client_secret) throw new Error('Payment is not available. Please contact the store.')
      setQuote(current => ({ ...current, ...result }))
      setClientSecret(result.client_secret)
      sessionStorage.setItem('portal:pending-cart', quote.cart.id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to start payment') }
    finally { setBusy(false); submitting.current = false }
  }

  const totals = quote?.cart
  return <PageContainer breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Cart' }]}>
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-3xl font-medium">Your cart</h1>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
      {resumeCart && !clientSecret && <p className="rounded border p-3 text-sm">Already attempted payment? <Link className="underline" href={`/dashboard/cart/thank-you?cart_id=${encodeURIComponent(resumeCart)}`}>Check that order before paying again.</Link></p>}
      {!cart.length ? <p>Your cart is empty. <Link className="underline" href="/dashboard/marketplace">Browse products</Link></p> : <>
        <div className="space-y-3">
          {cart.map(item => <div key={item.product.id} className={quote ? 'pointer-events-none opacity-75' : ''} inert={!!quote}>
            <CartItemCard item={item} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} />
          </div>)}
        </div>
        {!quote ? <form onSubmit={prepare} className="space-y-5 rounded-lg border bg-white p-6">
          <h2 className="text-xl font-medium">Delivery details</h2>
          <p className="text-sm text-neutral-500">Delivery within Bangladesh. Prices and available quantities will be checked before payment.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {addressFields.map(([key, label]) => <label key={key} className="block text-sm">{label}
              <input name={key} required={!['address_2', 'province'].includes(key)} maxLength={key.startsWith('address') ? 250 : 100}
                type={key === 'phone' ? 'tel' : 'text'} className="mt-1 block w-full rounded border p-3" />
            </label>)}
          </div>
          <label className="block text-sm">Discount code (optional)<input name="promo_code" maxLength={100} className="mt-1 block w-full rounded border p-3" /></label>
          <label className="block text-sm">Delivery notes (optional)<textarea name="delivery_notes" maxLength={1000} className="mt-1 block w-full rounded border p-3" /></label>
          <p>Product subtotal: <strong>{formatBdt(subtotal)}</strong></p>
          <button disabled={busy} className="rounded bg-neutral-900 px-5 py-3 text-white disabled:opacity-50">{busy ? 'Checking availability…' : 'Review order'}</button>
        </form> : <div className="space-y-5 rounded-lg border bg-white p-6">
          <h2 className="text-xl font-medium">Review and pay</h2>
          {!clientSecret && <label className="block text-sm">Delivery option
            <select className="mt-1 block w-full rounded border p-3" value={shippingId} onChange={event => setShippingId(event.target.value)}>
              {quote.shipping_options?.map(option => <option key={option.id} value={option.id}>{option.name}{option.amount != null ? ` — ${formatBdt(Number(option.amount))}` : ''}</option>)}
            </select>
          </label>}
          {totals && <dl className="space-y-2">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBdt(Number(totals.subtotal))}</dd></div>
            <div className="flex justify-between"><dt>Discount</dt><dd>-{formatBdt(Number(totals.discount_total))}</dd></div>
            <div className="flex justify-between"><dt>Tax</dt><dd>{formatBdt(Number(totals.tax_total))}</dd></div>
            {clientSecret && <><div className="flex justify-between"><dt>Delivery</dt><dd>{formatBdt(Number(totals.shipping_total))}</dd></div>
              <div className="flex justify-between border-t pt-3 font-semibold"><dt>Total</dt><dd>{formatBdt(Number(totals.total))}</dd></div></>}
          </dl>}
          {clientSecret && totals ? <StripePayment cartId={totals.id} clientSecret={clientSecret} /> : <div className="flex gap-4">
            <button disabled={busy} onClick={() => setQuote(null)} className="rounded border px-5 py-3">Edit order</button>
            <button disabled={busy || !shippingId} onClick={startPayment} className="rounded bg-neutral-900 px-5 py-3 text-white disabled:opacity-50">{busy ? 'Preparing payment…' : 'Continue to payment'}</button>
          </div>}
        </div>}
      </>}
    </div>
  </PageContainer>
}
