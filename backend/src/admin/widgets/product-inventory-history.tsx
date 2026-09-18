import { defineWidgetConfig } from '@medusajs/admin-sdk'
import InventoryHistoryTable from '../components/inventory-history-table'

export default function ProductInventoryHistory({ data }: { data: { id: string } }) {
  return <InventoryHistoryTable key={data.id} productId={data.id} />
}
export const config = defineWidgetConfig({ zone: 'product.details.after' })
