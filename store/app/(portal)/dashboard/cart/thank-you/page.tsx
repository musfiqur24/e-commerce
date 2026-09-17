'use client'

import React, { useState } from 'react'
import {
  CheckCircleSolid,
  CreditCard,
  DocumentText,
  MapPin,
  ShoppingBag,
  TruckFast,
} from '@medusajs/icons'
import PageContainer from '@/components/portal/PageContainer'
import TopImageBanner from '@/components/portal/TopImageBanner'
import Card from '@/components/portal/Card'
import Button from '@/components/portal/Button'
import { formatBdt } from '@/lib/currency'

const CHECKOUT_CONFIRMATION_STORAGE_KEY = 'posora:last-order-confirmation'

interface CheckoutDetails {
  email: string
  phone: string
  firstName: string
  lastName: string
  address: string
  apartment: string
  suburb: string
  state: string
  postcode: string
  deliveryNotes: string
  discountCode: string
}

interface AppliedDiscount {
  code: string
  promotionId: string
  type: 'fixed' | 'percentage' | 'medusa'
  value: number
  amount: number
  label: string
}

interface OrderConfirmation {
  placedAt: string
  checkoutDetails: CheckoutDetails
  items: Array<{
    id: string
    name: string
    category?: string
    quantity: number
    unitPrice: number
    lineTotal: number
    imageSrc?: string
  }>
  totals: {
    subtotal: number
    shipping: number
    gst: number
    discount: number
    total: number
  }
  discount?: AppliedDiscount | null
  payment?: {
    transactionId?: number
    responseCode?: string
    responseMessage?: string
    authorisationCode?: string
    totalAmount?: number
  }
  deals?: Array<{ dealId?: string; category?: string; name?: string }>
  failures?: Array<{ name?: string; error?: string }>
}

export default function CheckoutThankYouPage() {
  const [confirmation] = useState<OrderConfirmation | null>(() => {
    if (typeof window === 'undefined') return null

    try {
      const saved = window.sessionStorage.getItem(CHECKOUT_CONFIRMATION_STORAGE_KEY)
      return saved ? (JSON.parse(saved) as OrderConfirmation) : null
    } catch {
      return null
    }
  })

  const placedAtLabel = confirmation?.placedAt
    ? new Intl.DateTimeFormat('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(confirmation.placedAt))
    : ''

  return (
    <PageContainer
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Cart', href: '/dashboard/cart' },
        { label: 'Thank You' },
      ]}
    >
      <div className="w-full mx-auto space-y-4 pb-8">
        <TopImageBanner title="Thank You" subtitle="Order placed" />

        {!confirmation ? (
          <Card className="rounded-lg border-neutral-100 shadow-sm">
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <ShoppingBag className="h-9 w-9 text-neutral-300" />
              <h1 className="mt-4 text-lg font-medium text-neutral-900">No recent order summary found</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Your confirmed orders are still available from the orders page.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button
                  href="/dashboard/orders"
                  variant="primary"
                  className="h-10 rounded-md bg-neutral-900 px-5 text-xs text-white"
                >
                  View Orders
                </Button>
                <Button
                  href="/dashboard/marketplace"
                  variant="secondary"
                  className="h-10 rounded-md border border-neutral-200 bg-white px-5 text-xs text-neutral-700"
                >
                  Back to Products
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-6">
              <Card className="rounded-lg border-neutral-100 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                      <CheckCircleSolid className="h-6 w-6" />
                    </span>
                    <div>
                      <h1 className="text-xl font-semibold text-neutral-950">Your order has been placed</h1>
                      <p className="mt-1 text-sm text-neutral-500">
                        {placedAtLabel ? `Placed ${placedAtLabel}` : 'Payment approved'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      href="/dashboard/orders"
                      variant="primary"
                      className="h-10 rounded-md bg-neutral-900 px-4 text-xs text-white"
                    >
                      View Orders
                    </Button>
                    <Button
                      href="/dashboard/marketplace"
                      variant="secondary"
                      className="h-10 rounded-md border border-neutral-200 bg-white px-4 text-xs text-neutral-700"
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              </Card>

              <Card
                title="Order Items"
                subtitle={`${confirmation.items.length} product${confirmation.items.length === 1 ? '' : 's'}`}
                className="rounded-lg border-neutral-100 shadow-sm"
                headerAction={<ShoppingBag className="h-4 w-4 text-neutral-400" />}
              >
                <div className="space-y-3">
                  {confirmation.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-md border border-neutral-100 bg-white p-3">
                      <div className="relative h-14 w-14 shrink-0 rounded-md border border-neutral-200 bg-white p-2">
                        {item.imageSrc ? (
                          <img
                            src={item.imageSrc}
                            alt={item.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="h-full w-full rounded bg-neutral-100" />
                        )}
                        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[10px] font-medium text-white">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">{item.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                          {item.category || 'Medication'} · {formatBdt(item.unitPrice)} each
                        </p>
                      </div>
                      <span className="text-sm font-medium text-neutral-900">
                        {formatBdt(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card
                  title="Delivery"
                  className="rounded-lg border-neutral-100 shadow-sm"
                  headerAction={<MapPin className="h-4 w-4 text-neutral-400" />}
                >
                  <div className="space-y-2 text-sm text-neutral-700">
                    <p className="font-medium text-neutral-900">
                      {confirmation.checkoutDetails.firstName} {confirmation.checkoutDetails.lastName}
                    </p>
                    <p>{formatAddress(confirmation.checkoutDetails)}</p>
                    <p>{confirmation.checkoutDetails.phone}</p>
                    {confirmation.checkoutDetails.deliveryNotes && (
                      <p className="rounded-md bg-neutral-50 p-3 text-xs leading-5 text-neutral-500">
                        {confirmation.checkoutDetails.deliveryNotes}
                      </p>
                    )}
                  </div>
                </Card>

                <Card
                  title="Payment"
                  className="rounded-lg border-neutral-100 shadow-sm"
                  headerAction={<CreditCard className="h-4 w-4 text-neutral-400" />}
                >
                  <div className="space-y-2">
                    <InfoRow label="Status" value="Approved" />
                    <InfoRow label="Transaction" value={String(confirmation.payment?.transactionId || '-')} />
                    <InfoRow label="Authorisation" value={confirmation.payment?.authorisationCode || '-'} />
                    <InfoRow label="Response" value={confirmation.payment?.responseMessage || '-'} />
                  </div>
                </Card>
              </div>

              {Boolean(confirmation.deals?.length || confirmation.failures?.length) && (
                <Card
                  title="Order Processing"
                  className="rounded-lg border-neutral-100 shadow-sm"
                  headerAction={<DocumentText className="h-4 w-4 text-neutral-400" />}
                >
                  <div className="flex items-center gap-3 rounded-md border border-green-100 bg-green-50 px-3 py-3">
                    <CheckCircleSolid className="h-5 w-5 shrink-0 text-green-600" />
                    <p className="text-sm font-medium text-green-800">
                      Your order is being processed.
                    </p>
                  </div>
                </Card>
              )}
            </div>

            <aside className="xl:sticky xl:top-6 xl:self-start">
              <Card
                title="Summary"
                subtitle="Final amount paid"
                className="rounded-lg border-neutral-100 shadow-sm"
                noHeaderBorder
              >
                <div className="space-y-4">
                  <div className="space-y-2 border-b border-neutral-100 pb-4">
                    <SummaryRow label="Subtotal" value={confirmation.totals.subtotal} />
                    {confirmation.discount && (
                      <SummaryRow
                        label={`Discount (${confirmation.discount.code})`}
                        value={-confirmation.totals.discount}
                        tone="success"
                      />
                    )}
                    <SummaryRow label="Shipping" value={confirmation.totals.shipping} />
                    <SummaryRow label="GST" value={confirmation.totals.gst} />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-sm font-medium text-neutral-900">Total</span>
                    <span className="text-2xl font-semibold text-neutral-950">
                      {formatBdt(confirmation.totals.total)}
                    </span>
                  </div>
                  <div className="rounded-md border border-neutral-100 bg-neutral-50 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-900">
                      <TruckFast className="h-4 w-4 text-neutral-600" />
                      Delivery in progress
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                      Your order will appear in the orders page once processing is complete.
                    </p>
                  </div>
                </div>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </PageContainer>
  )
}

function SummaryRow({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'success'
}) {
  return (
    <div className="flex items-center justify-between text-xs text-neutral-500">
      <span>{label}</span>
      <span className={`font-medium ${tone === 'success' ? 'text-green-700' : 'text-neutral-900'}`}>
        {formatBdt(value)}
      </span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-neutral-500">{label}</span>
      <span className="truncate font-medium text-neutral-900">{value}</span>
    </div>
  )
}

function formatAddress(details: CheckoutDetails) {
  return [
    details.address,
    details.apartment,
    details.suburb,
    details.state,
    details.postcode,
  ].filter(Boolean).join(', ')
}
