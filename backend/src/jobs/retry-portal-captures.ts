import type { MedusaContainer } from '@medusajs/framework/types'
import { capturePortalOrder } from '../lib/capture-portal-order'

// Recover a capture after an interrupted browser request or missed local event.
export default async function retryPortalCaptures(container: MedusaContainer) {
  const query = container.resolve('query')
  const logger = container.resolve('logger')
  let skip = 0
  while (true) {
    const { data } = await query.graph({
      entity: 'order', fields: ['id', 'metadata'],
      filters: { status: ['pending'], created_at: { $gte: new Date(Date.now() - 7 * 86400000) } },
      pagination: { skip, take: 100, order: { created_at: 'ASC' } },
    })
    for (const order of data) {
      if (order.metadata?.source !== 'portal_checkout') continue
      try { await capturePortalOrder(container, order.id) }
      catch (error) { logger.error(`Capture needs attention for order ${order.id}`, error) }
    }
    if (data.length < 100) break
    skip += data.length
  }
}

export const config = { name: 'retry-portal-captures', schedule: '*/2 * * * *' }
