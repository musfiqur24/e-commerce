import 'server-only'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createMedusaCustomer, findMedusaCustomerByEmail } from './medusa'

export async function checkoutCustomer() {
  const { userId } = await auth()
  if (!userId) throw new Error('UNAUTHORIZED')
  const user = await currentUser()
  const email = user?.primaryEmailAddress
  if (!email || email.verification?.status !== 'verified') throw new Error('Verify your email before checking out')
  const existing = await findMedusaCustomerByEmail(email.emailAddress)
  if (existing) {
    if (existing.metadata?.clerk_user_id && existing.metadata.clerk_user_id !== userId) throw new Error('Customer account does not match your login')
    return existing
  }
  try {
    return await createMedusaCustomer({ email: email.emailAddress, clerkUserId: userId,
      firstName: user?.firstName ?? undefined, lastName: user?.lastName ?? undefined })
  } catch (error) {
    // A Clerk webhook may have created the same customer concurrently.
    const created = await findMedusaCustomerByEmail(email.emailAddress)
    if (created?.metadata?.clerk_user_id === userId) return created
    throw error
  }
}

export async function backendCheckout(body: Record<string, unknown>) {
  const key = process.env.MEDUSA_API_KEY
  if (!key) throw new Error('Checkout is not configured')
  const response = await fetch(`${(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000').replace(/\/$/, '')}/admin/custom/checkout`, {
    method: 'POST', cache: 'no-store', headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    }, body: JSON.stringify(body),
  })
  const data = await response.json()
  return { data, status: response.status }
}
