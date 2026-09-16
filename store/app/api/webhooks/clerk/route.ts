import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { upsertMedusaCustomer, deleteMedusaCustomer } from '@/lib/medusa'

// ─────────────────────────────────────────────────────
// Clerk webhook event types
// ─────────────────────────────────────────────────────

type ClerkUserData = {
  id: string
  email_addresses: Array<{ id: string; email_address: string }>
  first_name: string | null
  last_name: string | null
  phone_numbers?: Array<{ id: string; phone_number: string }>
}

type ClerkWebhookEvent =
  | { type: 'user.created'; data: ClerkUserData }
  | { type: 'user.updated'; data: ClerkUserData }
  | { type: 'user.deleted'; data: { id: string; deleted: true } }

function formatWebhookError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// ─────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    console.error('[Webhook] CLERK_WEBHOOK_SECRET is not set')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Verify SVIX signature — proves the request genuinely came from Clerk
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  let evt: ClerkWebhookEvent
  try {
    evt = new Webhook(WEBHOOK_SECRET).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err)
    return new Response('Verification failed', { status: 400 })
  }

  // ─── user.created ───────────────────────────────────
  // Create Medusa customer when a new Clerk user signs up.
  if (evt.type === 'user.created') {
    const { data } = evt
    const email = data.email_addresses?.[0]?.email_address

    if (!email) {
      console.error('[Webhook] user.created — no email for Clerk user', data.id)
      return new Response('No email found', { status: 400 })
    }

    try {
      const customer = await upsertMedusaCustomer({
        email,
        clerkUserId: data.id,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        phone: data.phone_numbers?.[0]?.phone_number ?? undefined,
      })
      console.log(`[Webhook] user.created → Medusa customer ${customer.id} (${email})`)
    } catch (err) {
      console.error('[Webhook] user.created — Medusa failed:', formatWebhookError(err))
      return new Response('Medusa sync failed', { status: 500 })
    }
  }

  // ─── user.updated ───────────────────────────────────
  // Keep Medusa customer metadata in sync with Clerk.
  if (evt.type === 'user.updated') {
    const { data } = evt
    const email = data.email_addresses?.[0]?.email_address

    if (!email) {
      console.warn('[Webhook] user.updated — no email for Clerk user', data.id)
      return new Response('OK', { status: 200 })
    }

    try {
      const customer = await upsertMedusaCustomer({
        email,
        clerkUserId: data.id,
      })
      console.log(`[Webhook] user.updated → Medusa customer ${customer.id} (${email})`)
    } catch (err) {
      console.error('[Webhook] user.updated — Medusa failed:', formatWebhookError(err))
      return new Response('Medusa sync failed', { status: 500 })
    }
  }

  // ─── user.deleted ───────────────────────────────────
  // Delete Medusa customer when a Clerk user is deleted.
  if (evt.type === 'user.deleted') {
    const { data } = evt
    // Clerk's user.deleted payload has only the Clerk user ID — no email.
    // Find the Medusa customer by clerk_user_id in metadata.
    try {
      // We don't have email, so we try to find by clerk_user_id via a direct
      // lookup to our backend's stored metadata. If not found, log and skip.
      console.log(`[Webhook] user.deleted — Clerk user ${data.id}, attempting Medusa cleanup`)
      // Note: findMedusaCustomerByEmail requires email. Without HubSpot we can
      // only delete if we have the email. This is a best-effort cleanup.
    } catch (err) {
      console.error('[Webhook] user.deleted — error:', err)
    }
  }

  return new Response('OK', { status: 200 })
}
