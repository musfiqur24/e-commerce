import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

const getBackendUrl = () =>
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'

const getApiKey = () => process.env.MEDUSA_API_KEY || ''

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await currentUser()
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null

  const authHeader = `Basic ${Buffer.from(`${getApiKey()}:`).toString('base64')}`

  try {
    let customer: { id: string; [key: string]: unknown } | null = null

    // 1. Try finding customer by email first
    if (userEmail) {
      try {
        const emailRes = await fetch(
          `${getBackendUrl()}/admin/customers?email=${encodeURIComponent(userEmail)}`,
          {
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }
        )
        if (emailRes.ok) {
          const data = await emailRes.json()
          customer = data?.customers?.[0] || null
        }
      } catch (e) {
        console.warn('Customer lookup by email failed:', e)
      }
    }

    // 2. Fallback: list customers and check metadata.clerk_user_id or email
    if (!customer) {
      try {
        const listRes = await fetch(
          `${getBackendUrl()}/admin/customers?limit=100`,
          {
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }
        )
        if (listRes.ok) {
          const data = await listRes.json()
          const customers = data?.customers || []
          customer = customers.find(
            (c: { id: string; email?: string; metadata?: Record<string, unknown> }) =>
              c.metadata?.clerk_user_id === userId ||
              (userEmail && c.email?.toLowerCase() === userEmail.toLowerCase())
          ) || null
        }
      } catch (e) {
        console.warn('Customer lookup by list failed:', e)
      }
    }

    // If customer doesn't exist in Medusa yet, they have no orders
    if (!customer) {
      return NextResponse.json({ orders: [] })
    }

    // Query customer orders from Medusa admin
    const ordersRes = await fetch(
      `${getBackendUrl()}/admin/orders?customer_id=${customer.id}&fields=*items,*summary`,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!ordersRes.ok) {
      console.warn('Orders query returned status:', ordersRes.status)
      return NextResponse.json({ orders: [] })
    }

    const ordersData = await ordersRes.json()
    const rawOrders = ordersData?.orders || []

    const orders = rawOrders.map((order: {
      id: string
      display_id?: number
      status?: string
      fulfillment_status?: string
      created_at: string
      summary?: { total?: number; shipping_total?: number }
      total?: number
      items?: Array<{
        id: string
        title: string
        unit_price?: number
        quantity: number
        thumbnail?: string | null
      }>
    }) => {
      let status: 'Processing' | 'In Transit' | 'Delivered' | 'Cancelled' = 'Processing'
      if (order.status === 'canceled' || order.status === 'archived') {
        status = 'Cancelled'
      } else if (order.fulfillment_status === 'delivered') {
        status = 'Delivered'
      } else if (order.fulfillment_status === 'shipped' || order.fulfillment_status === 'partially_shipped') {
        status = 'In Transit'
      }

      const totalAmount = order.summary?.total != null
        ? order.summary.total / 100
        : (order.total != null ? order.total / 100 : 0)

      const shippingAmount = order.summary?.shipping_total != null
        ? order.summary.shipping_total / 100
        : 0

      return {
        id: order.id,
        orderNumber: `#${order.display_id ?? order.id.slice(-6)}`,
        total: totalAmount,
        shippingTotal: shippingAmount,
        status,
        createdAt: order.created_at,
        items: (order.items || []).map((item) => ({
          id: item.id,
          name: item.title,
          price: item.unit_price ? item.unit_price / 100 : 0,
          quantity: item.quantity,
          thumbnail: item.thumbnail || null,
        })),
      }
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ orders: [] })
  }
}
