'use client'

import { useEffect, useRef, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation'
import { checkoutRequest } from '@/lib/checkout'

function PaymentForm({ cartId }: { cartId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  async function pay(event: React.FormEvent) {
    event.preventDefault()
    if (!stripe || !elements || submitting.current) return
    submitting.current = true; setBusy(true); setError('')
    const returnPath = `/dashboard/cart/thank-you?cart_id=${encodeURIComponent(cartId)}`
    try {
      const result = await stripe.confirmPayment({ elements,
        confirmParams: { return_url: `${window.location.origin}${returnPath}` }, redirect: 'if_required' })
      if (result.error) { setError(result.error.message || 'Payment failed'); return }
      // The signed webhook is the fallback if this request or the browser fails.
      try { await checkoutRequest({ action: 'complete', cart_id: cartId }) } catch { /* Read authoritative order status on return. */ }
      router.push(returnPath)
    } catch { setError('Could not confirm payment. Check your order status before trying again.') }
    finally { setBusy(false); submitting.current = false }
  }
  return <form onSubmit={pay} className="space-y-4">
    <PaymentElement />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={!stripe || !elements || busy} className="w-full rounded bg-neutral-900 px-5 py-3 text-white disabled:opacity-50">{busy ? 'Processing…' : 'Pay and place order'}</button>
    <p className="text-xs text-neutral-500">Card details are securely handled by Stripe.</p>
  </form>
}

export default function StripePayment({ cartId, clientSecret }: { cartId: string; clientSecret: string }) {
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    fetch('/api/checkout').then(response => response.json()).then(data => {
      if (!active) return
      if (!data.publishable_key) { setError('Payments are not configured yet. Please contact the store.'); return }
      setStripe(loadStripe(data.publishable_key))
    }).catch(() => { if (active) setError('Unable to load payment form. Please refresh.') })
    return () => { active = false }
  }, [])
  if (error) return <p role="alert">{error}</p>
  if (!stripe) return <p>Loading secure payment form…</p>
  return <Elements stripe={stripe} options={{ clientSecret }}><PaymentForm cartId={cartId} /></Elements>
}
