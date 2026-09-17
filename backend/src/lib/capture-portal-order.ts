import type { MedusaContainer } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { capturePaymentWorkflow } from '@medusajs/medusa/core-flows'

// Both browser completion and order.placed may arrive. The database-backed lock
// and the provider's idempotency key protect against duplicate captures.
export async function capturePortalOrder(container: MedusaContainer, orderId: string) {
  const locking = container.resolve(Modules.LOCKING)
  await locking.execute(`portal-capture:${orderId}`, async () => {
    const { data: orders } = await container.resolve('query').graph({
      entity: 'order',
      fields: ['id', 'status', 'metadata', 'payment_collections.payments.*'],
      filters: { id: orderId },
    })
    const order = orders[0]
    if (!order || order.status === 'canceled' || order.metadata?.source !== 'portal_checkout') return
    for (const collection of order.payment_collections ?? []) {
      for (const payment of collection?.payments ?? []) {
        if (payment?.provider_id === 'pp_stripe_stripe' && !payment.captured_at && !payment.canceled_at) {
          await capturePaymentWorkflow(container).run({ input: { payment_id: payment.id } })
        }
      }
    }
  })
}
