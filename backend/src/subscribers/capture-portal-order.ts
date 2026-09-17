import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { capturePortalOrder } from '../lib/capture-portal-order'

export default async function handler({ event, container }: SubscriberArgs<{ id: string }>) {
  await capturePortalOrder(container, event.data.id)
}

export const config: SubscriberConfig = {
  event: 'order.placed',
  context: { subscriberId: 'capture-portal-order' },
}
