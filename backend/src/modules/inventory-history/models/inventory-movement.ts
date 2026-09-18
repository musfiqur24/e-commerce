import { model } from '@medusajs/framework/utils'

export default model.define('inventory_movement', {
  id: model.id().primaryKey(),
  inventory_item_id: model.text(),
  location_id: model.text(),
  kind: model.text(),
  payload: model.json(),
})
