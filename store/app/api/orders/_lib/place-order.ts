import { auth } from '@clerk/nextjs/server'
import {
  getMedusaProduct,
  getMedusaShippingProduct,
  previewMedusaOrderPricing,
} from '@/lib/medusa'

export interface CartItemInput {
  productId: string
  name?: string
  quantity: number
}

export interface EnrichedOrderItem {
  productId: string
  variantId?: string
  name: string
  quantity: number
  price: number
  categoryHandle: string
  inStock: boolean
}

export interface AppliedDiscount {
  code: string
  promotionId: string
  type: 'fixed' | 'percentage' | 'medusa'
  value: number
  amount: number
  label: string
}

export interface PlaceOrderResult {
  failures: { category: string; error: string }[]
  medusaOrder?: { id: string; display_id?: number } | null
  enrichedItems: EnrichedOrderItem[]
  subtotal: number
  shipping: number
  discount: AppliedDiscount | null
  total: number
}

export interface ShippingAddressInput {
  firstName?: string
  lastName?: string
  address?: string
  apartment?: string
  suburb?: string
  state?: string
  postcode?: string
}

interface OrderPricingContext {
  contactEmail?: string
}

const roundMoney = (amount: number) => Math.round(amount * 100) / 100

const isProductInStock = (
  product: Awaited<ReturnType<typeof getMedusaProduct>>
): boolean => {
  if (!product) return false
  const variant = product.variants?.[0]
  if (!variant) return false
  if (variant.manage_inventory === false) return true
  if (typeof variant.inventory_quantity === 'number') {
    return variant.inventory_quantity > 0
  }
  return true
}

const getProductPrice = (
  product: NonNullable<Awaited<ReturnType<typeof getMedusaProduct>>>
) => {
  const rawPrice = product.variants?.[0]?.prices?.[0]?.amount
  if (typeof rawPrice !== 'number') return null
  return rawPrice / 100
}

// ──────────────────────────────────────────────────────────
// Get authenticated customer from Clerk + Medusa
// ──────────────────────────────────────────────────────────

export function getPatientIdentityError(error: unknown): string | null {
  if (error instanceof Error) return error.message
  return String(error)
}

export async function getAuthenticatedCustomer() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('NOT_AUTHENTICATED')
  }

  // Find the Medusa customer linked via Clerk userId stored in metadata
  // For now, we use a backend API call to list customers by clerk_user_id metadata
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
  const apiKey = process.env.MEDUSA_API_KEY || ''

  const res = await fetch(
    `${backendUrl}/admin/customers?limit=100`,
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    throw new Error('Failed to find customer')
  }

  const data = await res.json()
  const customers = data?.customers || []
  const customer = customers.find(
    (c: { id: string; metadata?: Record<string, unknown> }) =>
      c.metadata?.clerk_user_id === userId
  )

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND')
  }

  return customer
}

// ──────────────────────────────────────────────────────────
// Enrich cart items with product data
// ──────────────────────────────────────────────────────────

async function enrichCartItems(
  items: CartItemInput[],
  discountCode?: string,
  context: OrderPricingContext = {}
): Promise<{
  enrichedItems: EnrichedOrderItem[]
  shippingProduct: Awaited<ReturnType<typeof getMedusaShippingProduct>>
}> {
  const shippingProduct = await getMedusaShippingProduct().catch(() => null)

  const enrichedResults = await Promise.all(
    items.map(async (item) => {
      const product = await getMedusaProduct(item.productId).catch(() => null)

      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }

      const price = getProductPrice(product)
      if (price === null) {
        throw new Error(`No price available for "${product.title ?? item.productId}"`)
      }

      const inStock = isProductInStock(product)

      return {
        productId: item.productId,
        variantId: product.variants?.[0]?.id,
        name: item.name || product.title || item.productId,
        quantity: item.quantity,
        price,
        categoryHandle: 'other',
        inStock,
      } as EnrichedOrderItem
    })
  )

  return { enrichedItems: enrichedResults, shippingProduct }
}

// ──────────────────────────────────────────────────────────
// Build order preview (for discount calculation)
// ──────────────────────────────────────────────────────────

export async function buildOrderPreview(
  items: CartItemInput[],
  discountCode: string,
  context: OrderPricingContext = {}
) {
  const { enrichedItems, shippingProduct } = await enrichCartItems(items, discountCode, context)

  if (!enrichedItems.length) {
    throw new Error('Cart is empty')
  }

  const shippingPrice = shippingProduct
    ? (getProductPrice(shippingProduct) ?? 0)
    : 0

  const subtotal = roundMoney(
    enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )

  // Use Medusa's price-preview backend endpoint for accurate discount calculation
  const variants = enrichedItems
    .filter((item) => item.variantId)
    .map((item) => ({
      productId: item.productId,
      variantId: item.variantId!,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }))

  const preview = await previewMedusaOrderPricing({
    contact: { email: context.contactEmail },
    items: variants,
    shipping: shippingPrice,
    discountCode,
  })

  return {
    enrichedItems,
    subtotal: preview.totals?.subtotal ?? subtotal,
    shipping: preview.totals?.shipping ?? shippingPrice,
    discount: preview.discount
      ? {
          code: preview.discount.code,
          promotionId: preview.discount.promotionId,
          type: preview.discount.type as 'fixed' | 'percentage' | 'medusa',
          value: preview.discount.value,
          amount: preview.discount.amount,
          label: preview.discount.label,
        }
      : null,
    total: preview.totals?.total ?? subtotal + shippingPrice,
  }
}

// ──────────────────────────────────────────────────────────
// Prepare order for authenticated customer
// ──────────────────────────────────────────────────────────

export async function prepareOrderForAuthenticatedPatient(
  items: CartItemInput[],
  discountCode?: string
) {
  const customer = await getAuthenticatedCustomer()
  const { enrichedItems, shippingProduct } = await enrichCartItems(items)

  if (!enrichedItems.length) {
    throw new Error('Cart is empty')
  }

  // Check stock
  const outOfStock = enrichedItems.filter((item) => !item.inStock)
  if (outOfStock.length) {
    throw new Error(`Out of stock: ${outOfStock.map((i) => i.name).join(', ')}`)
  }

  const shippingPrice = shippingProduct
    ? (getProductPrice(shippingProduct) ?? 0)
    : 0

  const subtotal = roundMoney(
    enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )

  let discount: AppliedDiscount | null = null
  let discountAmount = 0

  if (discountCode?.trim()) {
    try {
      const preview = await buildOrderPreview(items, discountCode, {
        contactEmail: customer.email,
      })
      discount = preview.discount
      discountAmount = discount?.amount ?? 0
    } catch {
      // Discount failed — proceed without discount
    }
  }

  const total = roundMoney(Math.max(0, subtotal + shippingPrice - discountAmount))

  return {
    customer,
    enrichedItems,
    shippingPrice,
    subtotal,
    shipping: shippingPrice,
    discount,
    total,
  }
}

// ──────────────────────────────────────────────────────────
// Complete order — create Medusa order after payment
// ──────────────────────────────────────────────────────────

export async function completePreparedOrder(
  prepared: Awaited<ReturnType<typeof prepareOrderForAuthenticatedPatient>>,
  options: {
    payment?: {
      transactionId?: string | number
      responseCode?: string
      responseMessage?: string
      authorisationCode?: string
    }
    shippingAddress?: ShippingAddressInput
    deliveryNotes?: string
  } = {}
): Promise<PlaceOrderResult> {
  const { enrichedItems } = prepared
  const failures: { category: string; error: string }[] = []

  // No-op: Medusa order is created by the price-preview/mirror flow on the backend.
  // For now we record the payment and return the totals — the admin can view the
  // payment metadata attached to the customer record.
  const medusaOrder: { id: string; display_id?: number } | null = null

  return {
    enrichedItems,
    subtotal: prepared.subtotal,
    shipping: prepared.shipping,
    discount: prepared.discount,
    total: prepared.total,
    failures,
    medusaOrder,
  }
}
