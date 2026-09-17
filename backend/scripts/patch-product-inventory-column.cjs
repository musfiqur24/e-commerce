const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..', 'node_modules', '@medusajs', 'dashboard')
const cell = fs.readFileSync(path.join(__dirname, 'product-inventory-cell.js.txt'), 'utf8')
const source = path.join(root, 'src/hooks/table/columns/use-product-table-columns.tsx')
const dist = path.join(root, 'dist')
let patched = 0
function patch(file, isSource) {
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes('useProductTableColumns') || !text.includes('columnHelper.accessor("status", {')) return
  if (text.includes('id: "inventory_count"')) { patched++; return }
  const column = `columnHelper.display({ id: "inventory_count", header: () => "Inventory", cell: ({ row }) => inventoryElement(ProductInventoryCountCell, { productId: row.original.id }) }),\n      `
  text = text.replace('columnHelper.accessor("status", {', column + 'columnHelper.accessor("status", {')
  fs.writeFileSync(file, (isSource ? '// @ts-nocheck\n' : '') + cell + '\n' + text)
  patched++
}
if (fs.existsSync(source)) patch(source, true)
for (const file of fs.readdirSync(dist)) if (/\.(mjs|js)$/.test(file)) patch(path.join(dist, file), false)
if (patched < 2) throw new Error('Product inventory column patch did not match source and distribution')
console.log('[inventory-column] Standard product table patched')
