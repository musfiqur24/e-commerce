const fs = require('node:fs')
const path = require('node:path')

const assets = path.join(__dirname, '..', '.medusa', 'server', 'public', 'admin', 'assets')
if (!fs.existsSync(assets)) process.exit(0)

for (const name of fs.readdirSync(assets).filter(name => /^product-create-.*\.js$/.test(name))) {
  const file = path.join(assets, name)
  let source = fs.readFileSync(file, 'utf8')
  if (source.includes('id:"inventory_warehouse"')) continue
  const marker = '}),...ft({currencies:s,regions:a,pricePreferences:r,getFieldName:'
  if (!source.includes(marker)) continue
  const columns = '}),B.column({id:"inventory_warehouse",name:"Warehouse",header:"Warehouse",field:n=>`variants.${n.row.original.originalIndex}.inventory_warehouse`,type:"text",cell:n=>e.jsx(H.TextCell,{context:n})}),B.column({id:"starting_stock",name:"Inventory quantity",header:"Inventory quantity",field:n=>`variants.${n.row.original.originalIndex}.initial_stock`,type:"number",cell:n=>e.jsx(H.NumberCell,{context:n,min:0,placeholder:"Pieces"})}),...ft({currencies:s,regions:a,pricePreferences:r,getFieldName:'
  source = source.replace(marker, columns)
  fs.writeFileSync(file, source)
  console.log('[product-create-columns] patched ' + name)
}
