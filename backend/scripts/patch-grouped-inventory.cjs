const fs = require('node:fs')
const path = require('node:path')
const dist = path.join(__dirname, '../node_modules/@medusajs/dashboard/dist')
const component = fs.readFileSync(path.join(__dirname, 'grouped-inventory.js.txt'), 'utf8')
let found = false
for (const name of fs.readdirSync(dist).filter(name => /^inventory-list-.*\.mjs$/.test(name))) {
  const file = path.join(dist, name)
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('var InventoryItemListTable =')) continue
  found = true
  if (source.includes('function GroupedInventoryList')) {
    const originalStart = source.indexOf('import {\n  INVENTORY_ITEM_IDS_KEY')
    if (originalStart < 0) throw new Error('Cannot locate original inventory module')
    source = source.slice(originalStart)
  }
  source = source.replace('jsx4(InventoryListTable, {})', 'jsx4(GroupedInventoryList, {})')
  fs.writeFileSync(file, component + '\n' + source)
}
if (!found) throw new Error('Inventory route module was not found')
