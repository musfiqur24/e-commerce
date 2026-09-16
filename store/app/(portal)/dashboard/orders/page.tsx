'use client'

import React, { useState, useEffect } from 'react'
import PageContainer from '@/components/portal/PageContainer'
import TopImageBanner from '@/components/portal/TopImageBanner'
import Card from '@/components/portal/Card'
import Loading from '@/components/portal/Loading'
import OrderCard from '@/components/portal/OrderCard'
import type { OrderCardOrder } from '@/components/portal/OrderCard'

type OrderStatus = 'Processing' | 'In Transit' | 'Delivered' | 'Cancelled'
const tabs: OrderStatus[] = ['Processing', 'In Transit', 'Delivered', 'Cancelled']

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<OrderStatus>('Processing')
  const [orders, setOrders] = useState<OrderCardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders')
        if (!res.ok) throw new Error('Failed to load orders')
        const data = await res.json()
        setOrders(data.orders)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const filteredOrders = orders.filter((o) => o.status === activeTab)

  const headerAction = (
    <div className="flex w-full items-start gap-6 border-b border-neutral-200 sm:w-auto sm:border-0">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex shrink-0 items-center border-b-2 pb-3 text-[13px] font-normal leading-[1.1] transition-colors ${
            activeTab === tab
              ? 'border-[#757575] text-[#1c1c1c]'
              : 'border-transparent text-[#8d8d8d] hover:text-neutral-700'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )

  return (
    <PageContainer
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Orders' },
      ]}
    >
      <div className="space-y-4 md:space-y-6">
        <TopImageBanner title="Orders" />

        <Card
          title="My Orders"
          headerAction={headerAction}
          noPadding
          className="overflow-hidden rounded-lg border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]"
          headerClassName="min-h-0 flex-col items-stretch gap-3 px-3 py-3 sm:h-[51px] sm:flex-row sm:items-center sm:px-6 sm:py-4"
          titleClassName="text-base font-normal leading-[1.1]"
        >
          <div className="flex flex-col gap-4 px-3 pb-3 pt-4 md:px-6 md:pb-4">
            {loading ? (
              <Loading
                variant="inline"
                layout="list"
                message="Loading orders..."
              />
            ) : error ? (
              <div className="text-center py-12 text-sm text-red-500">{error}</div>
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} defaultExpanded={false} />
              ))
            ) : (
              <div className="text-center py-12 text-sm text-neutral-400">
                No {activeTab.toLowerCase()} orders found.
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
