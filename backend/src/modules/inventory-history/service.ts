import { MedusaService } from '@medusajs/framework/utils'
import InventoryMovement from './models/inventory-movement'

export default class InventoryHistoryService extends MedusaService({ InventoryMovement }) {}
