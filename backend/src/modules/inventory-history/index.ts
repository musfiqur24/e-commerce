import { Module } from '@medusajs/framework/utils'
import InventoryHistoryService from './service'

export default Module('inventoryHistory', { service: InventoryHistoryService })
