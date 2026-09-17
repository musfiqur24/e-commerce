import { MedusaError } from '@medusajs/framework/utils'
import { z } from '@medusajs/framework/zod'

export const checkoutItemsSchema = z.array(z.object({
  variant_id: z.string().min(1),
  quantity: z.number().int().positive().max(10000),
}).strict()).min(1).max(100)

export function aggregateItems(items: z.infer<typeof checkoutItemsSchema>) {
  const quantities = new Map<string, number>()
  for (const item of checkoutItemsSchema.parse(items)) {
    const quantity = (quantities.get(item.variant_id) ?? 0) + item.quantity
    if (quantity > 10000) throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Quantity exceeds the order limit')
    quantities.set(item.variant_id, quantity)
  }
  return Array.from(quantities, ([variant_id, quantity]) => ({ variant_id, quantity }))
}

export const addressSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  address_1: z.string().trim().min(1).max(250),
  address_2: z.string().trim().max(250).optional(),
  city: z.string().trim().min(1).max(100),
  province: z.string().trim().max(100).optional(),
  postal_code: z.string().trim().min(1).max(20),
  country_code: z.literal('bd'),
  phone: z.string().trim().min(8).max(25),
}).strict()

export function assertCartOwner(cart: { customer_id?: string | null; metadata?: Record<string, unknown> | null } | undefined, customerId: string) {
  if (!cart || cart.customer_id !== customerId || cart.metadata?.source !== 'portal_checkout') {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Checkout not found')
  }
}
