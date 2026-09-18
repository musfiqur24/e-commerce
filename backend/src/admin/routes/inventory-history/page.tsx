import { defineRouteConfig } from '@medusajs/admin-sdk'
import ProductHistoryList from '../../components/product-history-list'

export default function InventoryHistoryPage() { return <ProductHistoryList /> }
export const config = defineRouteConfig({ label: 'Inventory history' })
