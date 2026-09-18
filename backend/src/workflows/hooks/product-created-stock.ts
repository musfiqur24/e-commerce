import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { StepResponse } from '@medusajs/framework/workflows-sdk'
import { createInventoryLevelsWorkflow, createProductsWorkflow } from '@medusajs/medusa/core-flows'
import { initialStockSchema, stockOptionKey } from '../../lib/product-stock'

createProductsWorkflow.hooks.productsCreated(async ({ products, additional_data }, { container }) => {
  const stock = initialStockSchema.safeParse(additional_data?.initial_stock)
  if (!stock.success) throw new Error('Invalid starting inventory: ' + stock.error.message)
  if (!stock.data) return new StepResponse([], [])

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: locations } = await query.graph({ entity: 'stock_location', fields: ['id'] })
  const locationIds = new Set(locations.map((location: any) => location.id))

  const { data: createdProducts } = await query.graph({
    entity: 'product',
    filters: { id: products.map(product => product.id) },
    fields: ['id', 'variants.id', 'variants.variant_rank', 'variants.options.value', 'variants.options.option.title', 'variants.inventory_items.inventory_item_id'],
  })
  const requested = new Map(stock.data.quantities.map(entry => [stockOptionKey(entry.options), entry]))
  const levels: { inventory_item_id: string; location_id: string }[] = []
  const adjustments: { inventoryItemId: string; locationId: string; adjustment: number }[] = []
  for (const product of createdProducts as any[]) {
    for (const variant of product.variants ?? []) {
      const options = Array.isArray(variant.options)
        ? Object.fromEntries(variant.options.map((option: any) => [option.option?.title, option.value]))
        : variant.options ?? {}
      const requestedStock = stock.data.quantities.find(entry => entry.variant_rank !== undefined && entry.variant_rank === variant.variant_rank)
        || requested.get(stockOptionKey(options))
      const quantity = requestedStock?.quantity
      const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id
      if (!requestedStock || quantity === undefined) continue
      if (!inventoryItemId) throw new Error('A stocked variant has no inventory item. Enable managed inventory.')
      const locationId = requestedStock.location_id || stock.data.location_id
      if (!locationId || !locationIds.has(locationId)) throw new Error('Select a valid warehouse for every stocked variant')
      levels.push({ inventory_item_id: inventoryItemId, location_id: locationId })
      if (quantity > 0) adjustments.push({ inventoryItemId, locationId, adjustment: quantity })
    }
  }
  if (levels.length !== stock.data.quantities.length) throw new Error('Could not match every starting quantity to its product variant')
  if (levels.length) await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: levels } })
  if (adjustments.length) await container.resolve(Modules.INVENTORY).adjustInventory(adjustments)
  return new StepResponse(levels, levels)
})
