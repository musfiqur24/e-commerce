import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const getBackendUrl = () =>
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'

const getApiKey = () => process.env.MEDUSA_API_KEY || ''

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find Medusa customer by clerk_user_id stored in metadata
  const customersRes = await fetch(
    `${getBackendUrl()}/admin/customers?metadata[clerk_user_id]=${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  )

  if (!customersRes.ok) {
    return NextResponse.json({ error: 'Failed to find customer' }, { status: 500 })
  }

  const customersData = await customersRes.json()
  const customer = customersData?.customers?.[0]

  if (!customer) {
    return NextResponse.json({ orders: [] })
  }

  const upstream = await fetch(
    `${getBackendUrl()}/portal/orders?customerId=${customer.id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': getApiKey(),
      },
      cache: 'no-store',
    }
  )

  const body = await upstream.text()

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
    },
  })
}
