// Medusa admin API client for server-side use only.
// Uses the secret API key via Basic auth — never expose this client to the browser.
//
// SETUP: Create a secret API key in Medusa before using this module:
//   1. Start Medusa: cd backend && npm run dev
//   2. Open http://localhost:9000/app → Settings → API Keys → Create API Key (type: Secret)
//   3. Copy the generated key and set MEDUSA_API_KEY in client-portal/.env.local

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/medusa'
  }
  const url = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function getApiKey(): string {
  const key = process.env.MEDUSA_API_KEY
  if (!key) throw new Error('MEDUSA_API_KEY is not set')
  return key
}

async function medusaAdmin(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<unknown> {
  const { method = 'GET', body } = options
  const baseUrl = getBaseUrl()
  const url = baseUrl.startsWith('http') ? new URL(`${baseUrl}${path}`) : new URL(`${baseUrl}${path}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')


  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Authorization': `Basic ${Buffer.from(`${getApiKey()}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.text()
    if (!path.includes('/admin/portal-settings')) {
      console.error(`Medusa Admin Error [${method} ${path}]:`, res.status, error)
    }
    throw new Error(`Medusa Admin ${res.status} at ${path}: ${error}`)
  }

  if (res.status === 204) return null
  return res.json()
}

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

export interface MedusaCustomer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  has_account: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────────────
// Storefront API (Public/Customer access)
// ─────────────────────────────────────────────────────

async function medusaStore(
  path: string,
  options: { method?: string; body?: Record<string, unknown>; params?: Record<string, string> } = {}
): Promise<unknown> {
  const { method = 'GET', body, params } = options
  
  const baseUrl = getBaseUrl()
  const url = baseUrl.startsWith('http') ? new URL(`${baseUrl}${path}`) : new URL(`${baseUrl}${path}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value))
  }

  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  console.log(`[Medusa Store] ${method} ${url.toString()} | Key: ${publishableKey ? publishableKey.slice(0, 10) + '...' : 'MISSING'}`)

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': publishableKey || '',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const error = await res.text()
    console.error(`Medusa Store Error [${method} ${path}]:`, res.status, error)
    throw new Error(`Medusa Store ${res.status} at ${path}: ${error}`)
  }

  if (res.status === 204) return null
  return res.json()
}

/**
 * Fetch a single product from the Medusa store by ID.
 * Returns id, metadata, and categories with handles.
 */
export async function getMedusaProduct(id: string): Promise<{
  id: string
  title?: string
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  images?: { url: string }[]
  metadata?: Record<string, unknown>
  variants?: Array<{
    id: string
    manage_inventory?: boolean
    inventory_quantity?: number
    prices?: Array<{ amount: number; currency_code?: string }>
  }>
  categories?: { id: string; name: string; handle: string }[]
} | null> {
  try {
    const result = await medusaStore(`/store/products/${id}`, {
      params: {
        fields:
          'id,title,subtitle,description,thumbnail,*variants.prices,*categories,*images,metadata',
      },
    }) as {
      product: {
        id: string
        title?: string
        subtitle?: string | null
        description?: string | null
        thumbnail?: string | null
        images?: { url: string }[]
        metadata?: Record<string, unknown>
        variants?: Array<{
          id: string
          manage_inventory?: boolean
          inventory_quantity?: number
          prices?: Array<{ amount: number; currency_code?: string }>
        }>
        categories?: { id: string; name: string; handle: string }[]
      }
    }
    return result.product
  } catch {
    return null
  }
}

/**
 * Fetch products from the Medusa store.
 */
export async function getProducts(params?: Record<string, string>) {
  const result = await medusaStore('/store/products', { params }) as {
    products: Record<string, unknown>[]
    count: number
    offset: number
    limit: number
  }
  return result
}

// Reserved Medusa product-Type values used to gate marketplace/checkout behavior.
//   - Shipping: the Medusa product used purely to price shipping centrally.
export const SHIPPING_PRODUCT_TYPE_NAME = 'Shipping'

/**
 * Finds the Medusa product used to price the shipping charge, matched by
 * Product Type = "Shipping" in Medusa Admin. This product is looked up
 * purely so shipping's price is managed centrally in Medusa like any other
 * product, instead of a hardcoded value.
 */
export async function getMedusaShippingProduct(): Promise<{ id: string; price: number } | null> {
  let offset = 0
  const limit = 100
  let total = Number.POSITIVE_INFINITY

  while (offset < total) {
    const result = await getProducts({
      limit: String(limit),
      offset: String(offset),
      fields: 'id,metadata,*variants.prices,*type',
    })
    const batch = Array.isArray(result.products) ? result.products : []

    const match = batch.find((product) => {
      const type = (product as { type?: { value?: string } }).type
      return type?.value === SHIPPING_PRODUCT_TYPE_NAME
    }) as
      | { id: string; variants?: Array<{ prices?: Array<{ amount: number }> }> }
      | undefined

    if (match) {
      const bdtPrice = match.variants?.[0]?.prices?.find(
        (p: { currency_code?: string; amount: number }) => p.currency_code?.toLowerCase() === 'bdt'
      )
      const rawPrice = bdtPrice?.amount ?? match.variants?.[0]?.prices?.[0]?.amount
      return {
        id: match.id,
        // BDT prices are stored as whole taka in Medusa admin (not minor units)
        price: typeof rawPrice === 'number' ? rawPrice : 0,
      }
    }

    total = typeof result.count === 'number' ? result.count : batch.length
    if (batch.length === 0) break
    offset += batch.length
  }

  return null
}

// ─────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────

/**
 * Create a Medusa customer. Stores clerk_user_id in metadata.
 */
export async function createMedusaCustomer(data: {
  email: string
  clerkUserId: string
  firstName?: string
  lastName?: string
  phone?: string
}): Promise<MedusaCustomer> {
  const result = await medusaAdmin('/admin/customers', {
    method: 'POST',
    body: {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      metadata: {
        clerk_user_id: data.clerkUserId,
      },
    },
  }) as { customer: MedusaCustomer }

  return result.customer
}

/**
 * Find a Medusa customer by email. Returns null if not found.
 */
export async function findMedusaCustomerByEmail(email: string): Promise<MedusaCustomer | null> {
  // Use the email filter for an exact match in Medusa v2
  const params = new URLSearchParams({ email, limit: '1' })
  const result = await medusaAdmin(`/admin/customers?${params}`) as {
    customers: MedusaCustomer[]
  }

  return result.customers[0] ?? null
}

/**
 * Update an existing Medusa customer by their Medusa ID.
 */
export async function updateMedusaCustomer(
  customerId: string,
  data: {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
    metadata?: Record<string, unknown>
  }
): Promise<MedusaCustomer> {
  const result = await medusaAdmin(`/admin/customers/${customerId}`, {
    method: 'POST',
    body: {
      ...(data.email && { email: data.email }),
      ...(data.firstName !== undefined && { first_name: data.firstName }),
      ...(data.lastName !== undefined && { last_name: data.lastName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.metadata && { metadata: data.metadata }),
    },
  }) as { customer: MedusaCustomer }

  return result.customer
}

/**
 * Delete (soft-delete) a Medusa customer by their Medusa ID.
 */
export async function deleteMedusaCustomer(customerId: string): Promise<void> {
  await medusaAdmin(`/admin/customers/${customerId}`, { method: 'DELETE' })
}

/**
 * Upsert — create if the email is new, update if it already exists.
 */
export async function upsertMedusaCustomer(data: {
  email: string
  clerkUserId: string
  firstName?: string
  lastName?: string
  phone?: string
}): Promise<MedusaCustomer> {
  const existing = await findMedusaCustomerByEmail(data.email)

  if (existing) {
    return updateMedusaCustomer(existing.id, {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      metadata: {
        ...(existing.metadata || {}),
        clerk_user_id: data.clerkUserId,
      },
    })
  }

  return createMedusaCustomer(data)
}

export interface MedusaOrderPricingPreviewInput {
  contact?: {
    email?: string
    customerId?: string
  }
  items: Array<{
    productId: string
    variantId?: string
    name: string
    quantity: number
    price: number
  }>
  shipping: number
  discountCode: string
  currencyCode?: string
}

export interface MedusaOrderPricingPreview {
  discount: {
    code: string
    promotionId: string
    type: 'fixed' | 'percentage' | 'medusa'
    value: number
    amount: number
    label: string
  }
  totals: {
    subtotal: number
    shipping: number
    discount: number
    total: number
  }
}

export async function previewMedusaOrderPricing(
  input: MedusaOrderPricingPreviewInput
): Promise<MedusaOrderPricingPreview> {
  try {
    return (await medusaAdmin('/admin/custom/orders/price-preview', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    })) as MedusaOrderPricingPreview
  } catch (err) {
    if (err instanceof Error) {
      const jsonStart = err.message.indexOf('{')
      if (jsonStart >= 0) {
        let parsedMessage: string | undefined
        try {
          const parsed = JSON.parse(err.message.slice(jsonStart)) as {
            error?: string
          }
          parsedMessage = parsed.error
        } catch {
          // Fall through to the original message when the response is not JSON.
        }
        if (parsedMessage) {
          throw new Error(parsedMessage)
        }
      }
    }

    throw err
  }
}


