'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { DocumentText, ChevronDownMini, ChevronUpMini, TruckFast } from '@medusajs/icons'
import StatusBadge from './StatusBadge'
import Button from './Button'
import { formatBdt } from '@/lib/currency'

export type OrderCardStatus = 'Processing' | 'In Transit' | 'Delivered' | 'Cancelled'

export interface OrderCardOrder {
  id: string
  orderNumber: string
  total: number
  shippingTotal?: number
  status: OrderCardStatus
  paymentStatus?: string
  createdAt: string
  items: {
    id: string
    name: string
    price: number
    quantity: number
    thumbnail: string | null
  }[]
}

interface OrderCardProps {
  order: OrderCardOrder
  defaultExpanded?: boolean
}

export default function OrderCard({ order, defaultExpanded = false }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Processing': return 'yellow'
      case 'In Transit': return 'blue'
      case 'Delivered': return 'green'
      case 'Cancelled': return 'red'
      default: return 'grey'
    }
  }

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    // Optional: Add a small toast or visual feedback here
  }

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  return (
    <div className="overflow-hidden rounded-lg border border-[#e0e0e0] bg-white">
      {/* Header (Foldable toggle) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex cursor-pointer flex-col gap-3 bg-[#eee] px-3 py-3 transition-colors hover:bg-neutral-200 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start sm:gap-6">
          {/* Order ID */}
          <div className="flex flex-col">
            <span className="text-sm font-normal leading-[1.6] text-[#757575]">Order ID</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-normal leading-[1.6] text-[#1c1c1c] sm:text-lg">{order.orderNumber}</span>
              <button
                onClick={(e) => copyToClipboard(e, order.orderNumber)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <DocumentText className="size-3.75" />
              </button>
            </div>
          </div>

          <div className="hidden h-11 w-px bg-neutral-300 sm:block" />

          {/* Total */}
          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-normal leading-[1.6] text-[#757575]">Total</span>
            <span className="text-lg font-normal leading-[1.6] text-[#1c1c1c]">{formatBdt(order.total)}</span>
          </div>

          <div className="hidden h-11 w-px bg-neutral-300 sm:block" />

          {/* Order Date */}
          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-normal leading-[1.6] text-[#757575]">Order Date</span>
            <span className="text-lg font-normal leading-[1.6] text-[#1c1c1c]">{orderDate}</span>
          </div>
        </div>

        {/* Status & Toggle */}
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-3">
          <div className="flex flex-col sm:hidden">
            <span className="text-[13px] leading-[1.6] text-[#757575]">Ordered on {orderDate}</span>
            <span className="text-lg leading-[1.25] tracking-[-0.1728px] text-[#1c1c1c]">{formatBdt(order.total)}</span>
          </div>
          <StatusBadge color={getStatusColor(order.status)} className="rounded-full px-2 py-1.5 text-xs leading-[1.1]">
            {order.status}
          </StatusBadge>
          {order.paymentStatus && <span className="text-xs text-neutral-600">Payment: {order.paymentStatus.replaceAll('_', ' ')}</span>}
          <div className="text-neutral-500">
            {isExpanded ? <ChevronUpMini className="size-3.75" /> : <ChevronDownMini className="size-3.75" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="flex flex-col gap-4 border-t border-neutral-200 bg-white px-3 py-4 lg:flex-row lg:gap-8 lg:px-6">
          {/* Left: Order Items */}
          <div className="flex-1">
            <h3 className="mb-4 text-base font-normal leading-[1.1] text-[#1c1c1c]">Order Items</h3>
            <div className="space-y-4">
              {order.items.length > 0 ? (
                order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-lg bg-[#f9f9f9] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)]">
                    <div className="relative size-15 shrink-0 overflow-hidden rounded-md bg-white">
                      <Image
                        src={item.thumbnail || '/assets/orders-order-item.png'}
                        alt=""
                        fill
                        sizes="60px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-normal leading-[1.1] text-[#1c1c1c]">{item.name}</span>
                      <span className="mt-1 text-sm font-normal leading-[1.6] text-[#757575]">Qty {item.quantity}</span>
                      <span className="mt-1 text-sm font-normal leading-[1.6] text-[#1c1c1c]">{formatBdt(item.price)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-neutral-400">Item details not available.</p>
              )}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="w-full border-t border-neutral-200 pt-4 lg:w-auto lg:flex-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <h3 className="mb-3 text-base font-normal leading-[1.1] text-[#1c1c1c]">Order Summary</h3>
            <div className="space-y-3 text-base leading-[1.6]">
              <div className="flex items-center justify-between text-neutral-500">
                <span>Subtotal ({order.items.length} items)</span>
                <span className="text-[#1c1c1c]">{formatBdt(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-neutral-500">
                <span>Shipping</span>
                <span className="text-[#1c1c1c]">{formatBdt(order.shippingTotal ?? 0)}</span>
              </div>

              <div className="pt-4 mt-4 border-t border-neutral-200 flex items-center justify-between">
                <span className="text-base text-[#1c1c1c]">Total</span>
                <span className="text-base text-[#1c1c1c]">{formatBdt(order.total)}</span>
              </div>
              
              <div className="pt-4">
                <Button 
                  variant="primary" 
                  fullWidth 
                  className="h-10 rounded-md border-0 bg-[#2e2f2f] text-sm font-normal text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),0_0_0_1px_#18181b] hover:bg-black"
                >
                  <span className="flex items-center justify-center gap-2">
                    <TruckFast className="size-3.75" />
                    Track Delivery
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
