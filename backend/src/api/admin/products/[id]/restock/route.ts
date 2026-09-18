import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createInventoryLevelsWorkflow } from '@medusajs/medusa/core-flows'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { data } = await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: 'product', filters: { id: req.params.id },
    fields: ['id', 'variants.id', 'variants.title', 'variants.options', 'variants.manage_inventory', 'variants.inventory_items.inventory_item_id'],
  })
  if (!data[0]) return res.status(404).json({ message: 'Product not found' })
  const variants = (data[0] as any).variants
    .filter((variant: any) => variant.manage_inventory && variant.inventory_items?.length === 1)
    .map((variant: any) => ({ id: variant.id, title: variant.title, inventory_item_id: variant.inventory_items[0].inventory_item_id }))
  return res.json({ variants })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as { location_id: string; adjustments: { variant_id: string; quantity: number }[] }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: locations } = await query.graph({ entity: 'stock_location', filters: { id: body.location_id }, fields: ['id'] })
  if (!locations.length) return res.status(404).json({ message: 'Warehouse not found' })
  const { data } = await query.graph({
    entity: 'product', filters: { id: req.params.id },
    fields: ['id', 'variants.id', 'variants.manage_inventory', 'variants.inventory_items.inventory_item_id'],
  })
  if (!data[0]) return res.status(404).json({ message: 'Product not found' })
  const items = new Map((data[0] as any).variants
    .filter((variant: any) => variant.manage_inventory && variant.inventory_items?.length === 1)
    .map((variant: any) => [variant.id, variant.inventory_items[0].inventory_item_id]))
  const invalid = body.adjustments.find(entry => !items.has(entry.variant_id))
  if (invalid) return res.status(400).json({ message: 'One or more variants cannot be restocked here' })
  const inventory = req.scope.resolve(Modules.INVENTORY) as any
  for (const entry of body.adjustments) {
    const inventoryItemId = items.get(entry.variant_id)
    if (typeof inventoryItemId !== 'string') return res.status(400).json({ message: 'A variant has no inventory item' })
    try {
      await inventory.retrieveInventoryLevelByItemAndLocation(inventoryItemId, body.location_id)
    } catch {
      await createInventoryLevelsWorkflow(req.scope).run({ input: { inventory_levels: [{ inventory_item_id: inventoryItemId, location_id: body.location_id }] } })
    }
  }
  await inventory.adjustInventory(body.adjustments.map(entry => ({ inventoryItemId: items.get(entry.variant_id) as string, locationId: body.location_id, adjustment: entry.quantity })))
  return res.json({ added: body.adjustments.length })
}
