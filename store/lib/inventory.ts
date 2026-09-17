export interface ProductVariant {
  id: string
  title: string
  sku?: string | null
  price: number | null
  available: number | null
  options: Record<string, string>
}

export interface InventoryVariantInput {
  id: string
  title?: string
  sku?: string | null
  manage_inventory?: boolean
  inventory_quantity?: number
  prices?: Array<{ amount?: number; currency_code?: string }>
  options?: Array<{ value: string; option_id: string }>
}

// Null means deliberately untracked. Missing stock on a tracked variant fails closed.
export function mapVariant(variant: InventoryVariantInput, options: Array<{ id: string; title: string }> = []): ProductVariant {
  const amount = variant.prices?.find(p => p.currency_code?.toLowerCase() === 'bdt')?.amount
  return {
    id: variant.id,
    title: variant.title || 'Default',
    sku: variant.sku,
    price: typeof amount === 'number' && Number.isFinite(amount) ? amount : null,
    available: variant.manage_inventory === false ? null : Math.max(0, Math.floor(variant.inventory_quantity ?? 0)),
    options: Object.fromEntries((variant.options ?? []).map(value => [
      options.find(option => option.id === value.option_id)?.title ?? value.option_id,
      value.value,
    ])),
  }
}

export function stockMessage(available: number | null | undefined): string | null {
  if (available == null) return null
  if (available <= 0) return 'Out of stock'
  return available <= 5 ? `Only ${available} ${available === 1 ? 'piece' : 'pieces'} remaining` : null
}

export function canPurchase(variant: ProductVariant): boolean {
  return variant.price !== null && variant.price > 0 && (variant.available === null || variant.available > 0)
}
