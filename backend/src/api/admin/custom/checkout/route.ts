import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError, Modules } from '@medusajs/framework/utils'
import { z } from '@medusajs/framework/zod'
import {
  createCartWorkflow, addShippingMethodToCartWorkflow,
  listShippingOptionsForCartWithPricingWorkflow, createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow, completeCartWorkflow,
} from '@medusajs/medusa/core-flows'
import { addressSchema, aggregateItems, assertCartOwner, checkoutItemsSchema } from '../../../../lib/portal-checkout'
import { capturePortalOrder } from '../../../../lib/capture-portal-order'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('prepare'), customer_id: z.string().min(1), items: checkoutItemsSchema,
    address: addressSchema, promo_code: z.string().trim().max(100).optional(),
    delivery_notes: z.string().trim().max(1000).optional() }).strict(),
  z.object({ action: z.literal('payment'), customer_id: z.string().min(1), cart_id: z.string().min(1), shipping_option_id: z.string().min(1) }).strict(),
  z.object({ action: z.literal('complete'), customer_id: z.string().min(1), cart_id: z.string().min(1) }).strict(),
  z.object({ action: z.literal('status'), customer_id: z.string().min(1), cart_id: z.string().min(1) }).strict(),
])

const cartFields = ['id', 'customer_id', 'metadata', 'completed_at', 'currency_code', 'total', 'subtotal',
  'tax_total', 'discount_total', 'shipping_total', 'items.*', 'payment_collection.id',
  'payment_collection.payment_sessions.*', 'shipping_methods.*']

// This is an ADMIN route: only the server-held Medusa secret key may call it.
// The Next.js gateway derives customer_id from the authenticated Clerk session.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid checkout details', issues: parsed.error.flatten() })
  const input = parsed.data
  const query = req.scope.resolve('query')
  try {
    if (input.action === 'prepare') {
      const regionId = process.env.PORTAL_REGION_ID
      const salesChannelId = process.env.PORTAL_SALES_CHANNEL_ID
      if (!regionId || !salesChannelId) return res.status(503).json({ error: 'Checkout region and sales channel are not configured' })
      const customer = await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(input.customer_id)
      const { data: regions } = await query.graph({ entity: 'region', fields: ['id', 'currency_code'], filters: { id: regionId } })
      if (regions[0]?.currency_code !== 'bdt') throw new MedusaError(MedusaError.Types.INVALID_DATA, 'The portal region must use BDT')
      const items = aggregateItems(input.items)
      // Never accept prices, stock figures or product titles supplied by the browser.
      const { data: variants } = await query.graph({ entity: 'product_variant',
        fields: ['id', 'product.status', 'product.type.value'], filters: { id: items.map(item => item.variant_id) } })
      if (variants.length !== items.length || variants.some(v => v.product?.status !== 'published' || v.product?.type?.value === 'Shipping')) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, 'A selected product is no longer available')
      }
      const { result: created } = await createCartWorkflow(req.scope).run({ input: {
        customer_id: customer.id, email: customer.email, region_id: regionId,
        sales_channel_id: salesChannelId, currency_code: 'bdt', items,
        shipping_address: input.address, billing_address: input.address,
        promo_codes: input.promo_code ? [input.promo_code] : [],
        metadata: { source: 'portal_checkout', delivery_notes: input.delivery_notes ?? '' },
      } })
      const { result: options } = await listShippingOptionsForCartWithPricingWorkflow(req.scope).run({ input: { cart_id: created.id } })
      const { data: carts } = await query.graph({ entity: 'cart', fields: cartFields, filters: { id: created.id } })
      if (input.promo_code && Number(carts[0].discount_total) <= 0) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, 'This discount code does not apply to this cart')
      }
      return res.json({ cart: carts[0], shipping_options: options.map(option => ({ id: option.id, name: option.name, amount: option.calculated_price?.calculated_amount ?? option.amount })) })
    }

    const { data: carts } = await query.graph({ entity: 'cart', fields: cartFields, filters: { id: input.cart_id } })
    const cart = carts[0]
    assertCartOwner(cart, input.customer_id)

    if (input.action === 'payment') {
      if (!process.env.STRIPE_API_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: 'Stripe has not been configured yet' })
      if (cart.completed_at) throw new MedusaError(MedusaError.Types.INVALID_DATA, 'This checkout is already completed')
      return await req.scope.resolve(Modules.LOCKING).execute(`portal-session:${cart.id}`, async () => {
        // Re-read inside the lock so double clicks reuse one payment intent.
        const { data: fresh } = await query.graph({ entity: 'cart', fields: cartFields, filters: { id: cart.id } })
        const existing = fresh[0].payment_collection?.payment_sessions?.find(session => session?.provider_id === 'pp_stripe_stripe' && session.status !== 'canceled')
        if (existing) {
          if (fresh[0].shipping_methods?.[0]?.shipping_option_id !== input.shipping_option_id) {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Restart checkout to change shipping after payment has started')
          }
          return res.json({ cart: fresh[0], client_secret: existing.data?.client_secret })
        }
        await addShippingMethodToCartWorkflow(req.scope).run({ input: { cart_id: cart.id, options: [{ id: input.shipping_option_id }] } })
        const collectionId = fresh[0].payment_collection?.id ?? (await createPaymentCollectionForCartWorkflow(req.scope).run({ input: { cart_id: cart.id } })).result.id
        const { result: session } = await createPaymentSessionsWorkflow(req.scope).run({ input: {
          payment_collection_id: collectionId, provider_id: 'pp_stripe_stripe', customer_id: input.customer_id,
        } })
        const { data: updated } = await query.graph({ entity: 'cart', fields: cartFields, filters: { id: cart.id } })
        return res.json({ cart: updated[0], client_secret: session.data?.client_secret })
      })
    }

    if (input.action === 'complete') {
      // Medusa locks the cart and inventory items, reserves stock, verifies the
      // Stripe authorization, creates the order and compensates on failure.
      const { result } = await completeCartWorkflow(req.scope).run({ input: { id: cart.id } })
      try { await capturePortalOrder(req.scope, result.id) }
      catch (error) { req.scope.resolve('logger').error(`Capture pending for order ${result.id}`, error) }
    }
    const { data: links } = await query.graph({ entity: 'order_cart', fields: ['order_id'], filters: { cart_id: cart.id } })
    if (!links[0]) return res.status(202).json({ status: 'pending', cart_id: cart.id })
    const { data: orders } = await query.graph({ entity: 'order', fields: [
      'id', 'display_id', 'status', 'currency_code', 'total', 'subtotal', 'shipping_total', 'discount_total',
      'tax_total', 'items.*', 'payment_collections.status',
    ], filters: { id: links[0].order_id } })
    const order = orders[0]
    if (order.status === 'canceled') return res.json({ status: 'canceled', order })
    const paid = order.payment_collections?.length && order.payment_collections.every(collection => collection?.status === 'completed')
    return res.json({ status: paid ? 'paid' : 'processing', order })
  } catch (error) {
    req.scope.resolve('logger').error('Portal checkout failed', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    const status = error instanceof MedusaError && error.type === MedusaError.Types.NOT_FOUND ? 404 : 409
    return res.status(status).json({ error: message })
  }
}
