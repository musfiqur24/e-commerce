'use client'

import { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import PageContainer from '@/components/portal/PageContainer'
import TopImageBanner from '@/components/portal/TopImageBanner'
import Card from '@/components/portal/Card'
import StripePayment from '@/components/portal/StripePayment'
import Toast from '@/components/portal/Toast'
import { useCart } from '@/context/CartContext'
import { formatBdt } from '@/lib/currency'
import { checkoutRequest, type CheckoutResult } from '@/lib/checkout'
import { PlusMini, MinusMini, Trash, CheckCircleSolid } from '@medusajs/icons'

const addressFields = [
  ['first_name', 'First name'],
  ['last_name', 'Last name'],
  ['phone', 'Phone'],
  ['address_1', 'Address'],
  ['address_2', 'Apartment / building (optional)'],
  ['city', 'City'],
  ['province', 'District (optional)'],
  ['postal_code', 'Postal code'],
] as const

export default function CartPage() {
  const { cart, subtotal, updateQuantity, removeFromCart } = useCart()
  const [stage, setStage] = useState<1 | 2 | 3>(1)
  const [quote, setQuote] = useState<CheckoutResult | null>(null)
  const [shippingId, setShippingId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card')
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState<'error' | 'warning' | 'info' | 'success'>('error')

  const showToast = useCallback((msg: string, variant: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    setToastMessage(msg)
    setToastVariant(variant)
    setToastOpen(true)
  }, [])

  const [addressData, setAddressData] = useState<Record<string, string>>({
    first_name: '',
    last_name: '',
    phone: '',
    address_1: '',
    address_2: '',
    city: '',
    province: '',
    postal_code: '',
  })

  const submitting = useRef(false)
  const [resumeCart] = useState(() =>
    typeof window === 'undefined' ? '' : sessionStorage.getItem('portal:pending-cart') || ''
  )

  const handleFieldChange = (key: string, value: string) => {
    setAddressData((prev) => ({ ...prev, [key]: value }))
  }

  // Stage 1 -> Stage 2: Prepare cart & initialize payment
  async function handleProceedToPayment(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    try {
      const result = await checkoutRequest({
        action: 'prepare',
        items: cart.map((item) => ({
          variant_id: item.product.variantId,
          quantity: item.quantity,
        })),
        address: { ...addressData, country_code: 'bd' },
        promo_code: promoCode.trim(),
        delivery_notes: deliveryNotes.trim(),
      })

      if (!result.shipping_options?.length) {
        throw new Error('No delivery option is available for this address. Please contact the store.')
      }

      setQuote(result)
      const selectedShipId = result.shipping_options[0].id
      setShippingId(selectedShipId)

      // Immediately fetch clientSecret for payment
      if (result.cart) {
        const paymentResult = await checkoutRequest({
          action: 'payment',
          cart_id: result.cart.id,
          shipping_option_id: selectedShipId,
        })
        if (paymentResult.client_secret) {
          setClientSecret(paymentResult.client_secret)
          setQuote((curr) => ({ ...curr, ...paymentResult }))
          sessionStorage.setItem('portal:pending-cart', result.cart.id)
        }
      }

      setStage(2)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to prepare checkout', 'error')
    } finally {
      setBusy(false)
      submitting.current = false
    }
  }

  // Handle changing shipping method on stage 2
  async function handleShippingChange(newShipId: string) {
    if (!quote?.cart || submitting.current) return
    setShippingId(newShipId)
    submitting.current = true
    setBusy(true)
    try {
      const paymentResult = await checkoutRequest({
        action: 'payment',
        cart_id: quote.cart.id,
        shipping_option_id: newShipId,
      })
      if (paymentResult.client_secret) {
        setClientSecret(paymentResult.client_secret)
      }
      setQuote((curr) => ({ ...curr, ...paymentResult }))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update shipping', 'error')
    } finally {
      setBusy(false)
      submitting.current = false
    }
  }

  const totals = quote?.cart
  const totalAmount = totals ? Number(totals.total) : subtotal
  const shippingAmount = totals?.shipping_total != null ? Number(totals.shipping_total) : null
  const discountTotal = totals?.discount_total != null ? Number(totals.discount_total) : 0
  const taxTotal = totals?.tax_total != null ? Number(totals.tax_total) : 0
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <PageContainer breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Cart' }]}>
      {/* Toast notification — replaces inline error banners */}
      <Toast
        isOpen={toastOpen}
        onClose={() => setToastOpen(false)}
        message={toastMessage}
        variant={toastVariant}
      />

      <div className="space-y-6">
        <TopImageBanner title="Cart" />

        {resumeCart && !clientSecret && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
            Already attempted payment?{' '}
            <Link
              className="font-medium underline hover:text-amber-950"
              href={`/dashboard/cart/thank-you?cart_id=${encodeURIComponent(resumeCart)}`}
            >
              Check that order before paying again.
            </Link>
          </p>
        )}

        {!cart.length ? (
          <Card
            title="My Cart"
            noPadding
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs"
            headerClassName="min-h-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-neutral-100"
            titleClassName="text-base font-semibold text-neutral-900"
          >
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-3">
                <Trash className="size-6" />
              </div>
              <p className="text-base font-semibold text-neutral-800">Your cart is empty</p>
              <p className="mt-1 text-xs text-neutral-500">
                You haven&apos;t added any items to your cart yet.
              </p>
              <Link
                href="/dashboard/marketplace"
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-black"
              >
                Browse products
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* ── 3-Stage Progress Stepper ── */}
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Step 1: Personal details */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex size-7 sm:size-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      stage === 1
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : stage > 1
                        ? 'bg-emerald-600 text-white'
                        : 'border border-neutral-300 text-neutral-400'
                    }`}
                  >
                    {stage > 1 ? '✓' : '1'}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium transition-colors ${
                      stage === 1 ? 'text-neutral-900 font-semibold' : stage > 1 ? 'text-neutral-700' : 'text-neutral-400'
                    }`}
                  >
                    Personal details
                  </span>
                </div>

                {/* Connector Line 1 */}
                <div
                  className={`h-0.5 w-8 sm:w-16 transition-colors ${
                    stage > 1 ? 'bg-neutral-900' : 'bg-neutral-200'
                  }`}
                />

                {/* Step 2: Payment */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex size-7 sm:size-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      stage === 2
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : stage > 2
                        ? 'bg-emerald-600 text-white'
                        : 'border border-neutral-300 text-neutral-400'
                    }`}
                  >
                    {stage > 2 ? '✓' : '2'}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium transition-colors ${
                      stage === 2 ? 'text-neutral-900 font-semibold' : stage > 2 ? 'text-neutral-700' : 'text-neutral-400'
                    }`}
                  >
                    Payment
                  </span>
                </div>

                {/* Connector Line 2 */}
                <div
                  className={`h-0.5 w-8 sm:w-16 transition-colors ${
                    stage > 2 ? 'bg-neutral-900' : 'bg-neutral-200'
                  }`}
                />

                {/* Step 3: Complete */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex size-7 sm:size-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      stage === 3
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'border border-neutral-300 text-neutral-400'
                    }`}
                  >
                    3
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium transition-colors ${
                      stage === 3 ? 'text-neutral-900 font-semibold' : 'text-neutral-400'
                    }`}
                  >
                    Complete
                  </span>
                </div>
              </div>
            </div>

            {/* ── 2-Column Responsive Checkout Grid ── */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
              {/* ── Left Column: Form & Active Stage ── */}
              <div className="space-y-6 lg:col-span-7">
                {stage === 1 && (
                  <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                        Delivery & Personal Details
                      </h2>
                      <p className="mt-1 text-xs text-neutral-500">
                        All transactions are secure and encrypted. Delivery within Bangladesh.
                      </p>
                    </div>

                    <form onSubmit={handleProceedToPayment} className="space-y-4">
                      {/* Name fields */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            First name *
                          </label>
                          <input
                            required
                            type="text"
                            value={addressData.first_name}
                            onChange={(e) => handleFieldChange('first_name', e.target.value)}
                            placeholder="John"
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Last name *
                          </label>
                          <input
                            required
                            type="text"
                            value={addressData.last_name}
                            onChange={(e) => handleFieldChange('last_name', e.target.value)}
                            placeholder="Doe"
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Phone number *
                        </label>
                        <input
                          required
                          type="tel"
                          value={addressData.phone}
                          onChange={(e) => handleFieldChange('phone', e.target.value)}
                          placeholder="+880 1700 000000"
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                        />
                      </div>

                      {/* Street Address */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Street address *
                        </label>
                        <input
                          required
                          type="text"
                          value={addressData.address_1}
                          onChange={(e) => handleFieldChange('address_1', e.target.value)}
                          placeholder="House 12, Road 4, Sector 7"
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                        />
                      </div>

                      {/* Apartment / Suite */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Apartment, suite, unit (optional)
                        </label>
                        <input
                          type="text"
                          value={addressData.address_2}
                          onChange={(e) => handleFieldChange('address_2', e.target.value)}
                          placeholder="Apt 4B"
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                        />
                      </div>

                      {/* City, District, Postal Code */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            City *
                          </label>
                          <input
                            required
                            type="text"
                            value={addressData.city}
                            onChange={(e) => handleFieldChange('city', e.target.value)}
                            placeholder="Dhaka"
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            District (optional)
                          </label>
                          <input
                            type="text"
                            value={addressData.province}
                            onChange={(e) => handleFieldChange('province', e.target.value)}
                            placeholder="Dhaka"
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Postal code *
                          </label>
                          <input
                            required
                            type="text"
                            value={addressData.postal_code}
                            onChange={(e) => handleFieldChange('postal_code', e.target.value)}
                            placeholder="1230"
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                      </div>

                      {/* Delivery Notes */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Delivery notes (optional)
                        </label>
                        <textarea
                          rows={2}
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="Special instructions for the courier…"
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                        />
                      </div>

                      {/* Submit */}
                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={busy}
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 font-semibold text-white shadow-sm transition-all hover:bg-black active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
                        >
                          <span>{busy ? 'Preparing checkout…' : 'Proceed to Payment →'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {stage === 2 && (
                  <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                        Select Payment Option
                      </h2>
                      <p className="mt-1 text-xs text-neutral-500">
                        All transactions are secure and encrypted
                      </p>
                    </div>

                    {/* Delivery Option Selector */}
                    {quote?.shipping_options && quote.shipping_options.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                          Delivery Option
                        </label>
                        <div className="grid grid-cols-1 gap-2.5">
                          {quote.shipping_options.map((option) => (
                            <label
                              key={option.id}
                              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                                shippingId === option.id
                                  ? 'border-neutral-900 bg-neutral-50/60 ring-1 ring-neutral-900'
                                  : 'border-neutral-200 hover:border-neutral-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="shipping_option"
                                  value={option.id}
                                  checked={shippingId === option.id}
                                  onChange={() => handleShippingChange(option.id)}
                                  className="size-4 accent-neutral-900"
                                />
                                <span className="text-sm font-medium text-neutral-800">
                                  {option.name}
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-neutral-900">
                                {option.amount != null ? formatBdt(Number(option.amount)) : 'Free'}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Method Cards */}
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        Payment Method
                      </label>

                      {/* Credit Card Option */}
                      <div
                        className={`rounded-xl border p-4 transition-all ${
                          paymentMethod === 'card'
                            ? 'border-neutral-900 bg-white ring-1 ring-neutral-900'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setPaymentMethod('card')}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="payment_method"
                              checked={paymentMethod === 'card'}
                              onChange={() => setPaymentMethod('card')}
                              className="size-4 accent-neutral-900"
                            />
                            <div>
                              <span className="text-sm font-semibold text-neutral-900">
                                Credit / Debit Card
                              </span>
                              <p className="text-xs text-neutral-500">
                                Pay securely using Visa, Mastercard, Amex, or Discover
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-80 text-xs font-semibold text-neutral-600">
                            <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px]">VISA</span>
                            <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px]">MC</span>
                            <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px]">AMEX</span>
                          </div>
                        </div>

                        {/* Embedded Stripe Form */}
                        {paymentMethod === 'card' && clientSecret && quote?.cart && (
                          <div className="mt-4 pt-4 border-t border-neutral-100">
                            <StripePayment
                              cartId={quote.cart.id}
                              clientSecret={clientSecret}
                              totalAmount={totalAmount}
                            />
                          </div>
                        )}
                      </div>

                      {/* Cash on Delivery Option (Preview / Disabled) */}
                      <div className="rounded-xl border border-neutral-200 p-4 opacity-60">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="payment_method"
                              disabled
                              className="size-4"
                            />
                            <div>
                              <span className="text-sm font-medium text-neutral-700">
                                Cash on delivery
                              </span>
                              <p className="text-xs text-neutral-400">
                                Available for eligible standard local delivery
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                            Unavailable
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Back Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setStage(1)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 shadow-xs transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.98]"
                      >
                        <span className="text-sm leading-none">←</span>
                        Back to delivery details
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Policy Card (Matching Mockup) ── */}
                <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-neutral-900">
                      Cancellation & Refund Policy
                    </h3>
                    <p className="text-xs leading-relaxed text-neutral-500 max-w-md">
                      At Posora, we ensure all orders are packed with verified authentication. Items can be returned within 30 days of delivery if unopened and in original packaging. Enjoy peace of mind with 24/7 dedicated support.
                    </p>
                    <Link
                      href="/dashboard/support"
                      className="inline-block pt-1 text-xs font-semibold text-neutral-900 underline hover:text-black"
                    >
                      See more details
                    </Link>
                  </div>
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-amber-50/80 border border-amber-200/60 text-amber-700">
                    <CheckCircleSolid className="size-8" />
                  </div>
                </div>
              </div>

              {/* ── Right Column: Order Summary & Cart Preview ── */}
              <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-24">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-neutral-900">
                      Your cart <span className="font-normal text-neutral-500">({totalItemsCount})</span>
                    </h2>
                    {stage === 1 && (
                      <span className="text-xs text-neutral-400">
                        Edit in cart
                      </span>
                    )}
                  </div>

                  {/* Cart Items List */}
                  <div className="max-h-72 overflow-y-auto space-y-3 pr-1 divide-y divide-neutral-100">
                    {cart.map((item) => (
                      <div key={item.product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-14 shrink-0 rounded-xl bg-neutral-50 border border-neutral-100 p-1 flex items-center justify-center overflow-hidden">
                            {item.product.imageSrc ? (
                              <img
                                src={item.product.imageSrc}
                                alt={item.product.name}
                                className="size-full object-contain"
                              />
                            ) : (
                              <div className="size-full bg-neutral-200 rounded" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-neutral-900 truncate">
                              {item.product.name}
                            </h4>
                            {item.product.variantTitle && (
                              <p className="text-[11px] text-neutral-500 truncate">
                                {item.product.variantTitle}
                              </p>
                            )}
                            <p className="text-[11px] text-neutral-400">
                              Qty: {item.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-neutral-900">
                            {formatBdt(item.product.price * item.quantity)}
                          </span>
                          {stage === 1 && (
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="size-5 flex items-center justify-center rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs"
                                aria-label="Decrease quantity"
                              >
                                <MinusMini className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="size-5 flex items-center justify-center rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs"
                                aria-label="Increase quantity"
                              >
                                <PlusMini className="size-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Code Accordion */}
                  <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3">
                    <button
                      type="button"
                      onClick={() => setPromoOpen(!promoOpen)}
                      className="flex w-full items-center justify-between text-xs font-medium text-neutral-700 hover:text-neutral-900"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          %
                        </span>
                        <span>Apply coupon code</span>
                      </div>
                      <span className="text-neutral-400 text-xs">{promoOpen ? '▲' : '▼'}</span>
                    </button>

                    {promoOpen && (
                      <div className="mt-3 flex gap-2 pt-2 border-t border-neutral-200/60">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="Coupon code"
                          className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Order Summary Box */}
                  <div className="rounded-xl bg-neutral-50 p-4 space-y-2.5 border border-neutral-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                      Order summary
                    </h3>
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span>Subtotal</span>
                      <span className="font-medium text-neutral-900">{formatBdt(subtotal)}</span>
                    </div>

                    <div className="flex justify-between text-xs text-neutral-600">
                      <span>Shipping</span>
                      <span className="font-medium text-neutral-900">
                        {shippingAmount != null ? (shippingAmount > 0 ? formatBdt(shippingAmount) : 'Free') : 'Calculated at payment'}
                      </span>
                    </div>

                    {discountTotal > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600">
                        <span>Discount</span>
                        <span className="font-medium">-{formatBdt(discountTotal)}</span>
                      </div>
                    )}

                    {taxTotal > 0 && (
                      <div className="flex justify-between text-xs text-neutral-600">
                        <span>Tax</span>
                        <span className="font-medium text-neutral-900">{formatBdt(taxTotal)}</span>
                      </div>
                    )}

                    <div className="border-t border-neutral-200 pt-3 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-neutral-900">Total</span>
                      <span className="text-xl font-bold tracking-tight text-neutral-900">
                        {formatBdt(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
