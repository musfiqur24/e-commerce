import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { summarizeProductInventory } from '../../../../../lib/product-inventory-summary'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { data } = await req.scope.resolve('query').graph({
    entity: 'product',
    filters: { id: req.params.id },
    fields: [
      'id',
      'variants.id',
      'variants.title',
      'variants.manage_inventory',
      'variants.inventory_items.required_quantity',
      'variants.inventory_items.inventory.location_levels.stocked_quantity',
      'variants.inventory_items.inventory.location_levels.reserved_quantity',
    ],
  })

  if (!data[0]) return res.status(404).json({ message: 'Product not found' })

  res.setHeader('Cache-Control', 'no-store')
  return res.json(summarizeProductInventory(data[0].variants as any))
}
