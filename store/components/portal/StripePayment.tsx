'use client'

import { useEffect, useRef, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation'
import { checkoutRequest } from '@/lib/checkout'
import { formatBdt } from '@/lib/currency'

function PaymentForm({ cartId, totalAmount }: { cartId: string; totalAmount?: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(true)
  const submitting = useRef(false)

  async function pay(event: React.FormEvent) {
    event.preventDefault()
    if (!stripe || !elements || submitting.current || !agreed) return
    submitting.current = true
    setBusy(true)
    setError('')
    const returnPath = `/dashboard/cart/thank-you?cart_id=${encodeURIComponent(cartId)}`
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}${returnPath}` },
        redirect: 'if_required',
      })
      if (result.error) {
        setError(result.error.message || 'Payment failed')
        return
      }
      try {
        await checkoutRequest({ action: 'complete', cart_id: cartId })
      } catch {
        /* Read authoritative order status on return. */
      }
      router.push(returnPath)
    } catch {
      setError('Could not confirm payment. Check your order status before trying again.')
    } finally {
      setBusy(false)
      submitting.current = false
    }
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      
      <button
        type="submit"
        disabled={!stripe || !elements || busy || !agreed}
        className="w-full rounded-xl bg-neutral-900 py-3.5 px-6 font-semibold text-white shadow-sm transition-all hover:bg-black active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
      >
        {busy ? 'Processing payment…' : totalAmount != null ? `Pay | ${formatBdt(totalAmount)}` : 'Pay and place order'}
      </button>

      <label className="flex items-center justify-center gap-2 cursor-pointer pt-1 text-xs text-neutral-500 select-none">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="size-4 rounded border-neutral-300 accent-neutral-900"
        />
        <span>
          By clicking this, I agree to the <span className="font-medium text-neutral-800 underline">Terms & Conditions</span> and <span className="font-medium text-neutral-800 underline">Privacy Policy</span>
        </span>
      </label>
    </form>
  )
}

export default function StripePayment({
  cartId,
  clientSecret,
  totalAmount,
}: {
  cartId: string
  clientSecret: string
  totalAmount?: number
}) {
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/checkout')
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        if (!data.publishable_key) {
          setError('Payments are not configured yet. Please contact the store.')
          return
        }
        setStripe(loadStripe(data.publishable_key))
      })
      .catch(() => {
        if (active) setError('Unable to load payment form. Please refresh.')
      })
    return () => {
      active = false
    }
  }, [])

  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>
  if (!stripe) return <p className="text-sm text-neutral-500">Loading secure payment form…</p>

  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <PaymentForm cartId={cartId} totalAmount={totalAmount} />
    </Elements>
  )
}
