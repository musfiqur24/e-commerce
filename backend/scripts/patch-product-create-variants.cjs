const fs = require('node:fs')
const path = require('node:path')

// Apply to both dashboard source and distributed modules: Admin builds use dist.
function patchProductCreate(source) {
  // Remove remnants of the retired medication field from previously patched bundles.
  source = source.replace(/const strengthFields = fields\.filter\(\(field\) => field\.name === "medication_form_strength"\);\s*const remainingFields = fields\.filter\(\(field\) => field\.name !== "medication_form_strength"\);/g, '')
    .replace(/ProductCreateGeneralSection, \{ form, strengthFields \}/g, 'ProductCreateGeneralSection, { form }')
    .replace(/fields: remainingFields/g, 'fields')
  if (source.includes('const handleOptionValueUpdate =')) {
    source = source.replace(/(?:\/\* PATCHED_VARIANTS_REPLACE \*\/\s*)?(?:variants\.replace\(newVariants\);?\s*)*form\.setValue\("variants", newVariants\);?/g,
      'variants.replace(decorateVariantsWithDefaultValues(newVariants));')
    // Read current form values, including titles edited since the last render.
    source = source.replace(/const newOptions = \[\.\.\.watchedOptions\]/g, 'const newOptions = form.getValues("options").map((option) => ({ ...option }))')
    source = source.replace(/const oldVariants = \[\.\.\.watchedVariants\]/g, 'const oldVariants = form.getValues("variants")')
  }

  // Preserve the grid's transient quantity in the create form values, then
  // pass only valid quantities to the backend workflow.
  if (!source.includes('inventory_warehouse')) {
    source = source.replace(
      'inventory_kit: z.boolean().optional(),',
      'inventory_kit: z.boolean().optional(),\n  inventory_warehouse: z.string().optional(),\n  initial_stock: z.string().optional(),'
    ).replace(
      'inventory_kit: import_zod4.z.boolean().optional(),',
      'inventory_kit: import_zod4.z.boolean().optional(),\n      inventory_warehouse: import_zod4.z.string().optional(),\n      initial_stock: import_zod4.z.string().optional(),'
    )
  }

  if (source.includes('normalizeProductFormValues')) {
    const initialStock = `additional_data: { ...values.additional_data, initial_stock: (() => {
      const quantities = values.variants.filter((variant) => variant.should_create && variant.initial_stock !== undefined && variant.initial_stock !== "" && Number.isSafeInteger(Number(variant.initial_stock)) && Number(variant.initial_stock) >= 0).map((variant) => ({ options: variant.options, quantity: Number(variant.initial_stock) }))
      return quantities.length ? { quantities } : undefined
    })() },`
    source = source.replace('additional_data: values.additional_data,', initialStock)
    source = source.replace(
      'variant.should_create && variant.initial_stock !== undefined',
      'variant.should_create && variant.inventory_warehouse && variant.initial_stock !== undefined'
    ).replace(
      '({ options: variant.options, quantity: Number(variant.initial_stock) })',
      '({ options: variant.options, quantity: Number(variant.initial_stock), location_id: variant.inventory_warehouse })'
    )
  }

  if (source.includes('const onNext = async (currentTab') && source.includes('normalizeProductFormValues')) {
    source = source.replace(/const onNext = async \(currentTab(?:: Tab)?\) => \{[\s\S]*?\n  (?:  )*\};?(?=\s*(?:useEffect|\(0,))/, (old, offset) => {
      const ts = old.includes('currentTab: Tab')
      const toast = source.includes('import_ui') ? '(0, import_ui.toast.error)' : 'toast.error'
      // Preserve the existing bundle's toast binding rather than guessing its suffix.
      const errorCall = [...source.slice(0, offset).matchAll(/([\w.]+)\.error\(error\.message\)/g)].at(-1)?.[1]
      const notify = errorCall ? `${errorCall}.error` : toast
      return `const onNext = async (currentTab${ts ? ': Tab' : ''}) => {
    /* PRODUCT_CREATE_VALIDATION_V2 */
    // Blur commits a pending option chip through ChipInput's own handler.
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLInputElement) {
      document.activeElement.blur();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const valid = await form.trigger(undefined, { shouldFocus: true });
    if (!valid) {
      const fields = ["title", "options", "variants", "additional_data"]${ts ? ' as const' : ''};
      const field = fields.find((name) => form.getFieldState(name).invalid);
      const error = field && form.getFieldState(field).error;
      ${notify}(error && error.message && error.message !== "invalid_length"
        ? error.message
        : field === "options" ? "Enter a title and at least one value for each option."
        : field === "variants" ? "Select at least one variant and check its fields."
        : "Please check the highlighted fields before continuing.");
      return;
    }
    if (currentTab === ${ts ? 'Tab.DETAILS' : '"details"'}) setTab(${ts ? 'Tab.ORGANIZE' : '"organize"'});
    if (currentTab === ${ts ? 'Tab.ORGANIZE' : '"organize"'}) setTab(${ts ? 'Tab.VARIANTS' : '"variants"'});
    if (currentTab === ${ts ? 'Tab.VARIANTS' : '"variants"'}) setTab(${ts ? 'Tab.INVENTORY' : '"inventory"'});
  }${ts ? '' : ';'}`
    })
  }

  // Add the initial quantity beside each variant, immediately before prices.
  if (source.includes('const useColumns =') && !source.includes('id: "starting_stock"')) {
    const column = `      columnHelper.column({
        id: "starting_stock",
        name: "Starting stock",
        header: "Starting stock",
        field: (context) =>
          \`variants.\${context.row.original.originalIndex}.initial_stock\`,
        type: "number",
        cell: (context) => {
          return <DataGrid.NumberCell context={context} min={0} placeholder="Pieces" />
        },
      }),

`
    source = source.replace('      ...createDataGridPriceColumns<', column + '      ...createDataGridPriceColumns<')
  }

  source = source.replace(
    /id: "starting_stock",([\s\S]*?)type: "text",([\s\S]*?)<DataGrid\.TextCell context=\{context\} \/>/g,
    'id: "starting_stock",$1type: "number",$2<DataGrid.NumberCell context={context} min={0} placeholder="Pieces" />'
  )
  source = source.replace(/name: "Starting stock",\n        header: "Starting stock"/g, 'name: "Inventory quantity",\n        header: "Inventory quantity"')
  source = source.replace(/name:"Starting stock",header:"Starting stock"/g, 'name:"Inventory quantity",header:"Inventory quantity"')

  if (source.includes('id: "starting_stock"') && !source.includes('id: "inventory_warehouse"')) {
    const warehouseColumn = `      columnHelper.column({
        id: "inventory_warehouse",
        name: "Warehouse",
        header: "Warehouse",
        field: (context) =>
          \`variants.\${context.row.original.originalIndex}.inventory_warehouse\`,
        type: "text",
        cell: (context) => {
          return <DataGrid.TextCell context={context} />
        },
      }),

`
    source = source.replace('      columnHelper.column({\n        id: "starting_stock",', warehouseColumn + '      columnHelper.column({\n        id: "starting_stock",')
  }

  if (source.includes('useColumns3 =') && !source.includes('id:"starting_stock"')) {
    const column = `columnHelper6.column({id:"starting_stock",name:"Starting stock",header:"Starting stock",field:(context)=>\`variants.\${context.row.original.originalIndex}.initial_stock\`,type:"number",cell:(context)=>/* @__PURE__ */(0,import_jsx_runtime111.jsx)(DataGrid.NumberCell,{context,min:0,placeholder:"Pieces"})}),`
    source = source.replace('...createDataGridPriceColumns({', column + '...createDataGridPriceColumns({')
  }
  source = source.replace(
    /id:"starting_stock",name:"Starting stock",header:"Starting stock",field:\(context\)=>`variants\.\$\{context\.row\.original\.originalIndex\}\.initial_stock`,type:"text",cell:\(context\)=>\/\* @__PURE__ \*\/\(0,import_jsx_runtime111\.jsx\)\(DataGrid\.TextCell,\{context\}\)/g,
    'id:"starting_stock",name:"Starting stock",header:"Starting stock",field:(context)=>`variants.${context.row.original.originalIndex}.initial_stock`,type:"number",cell:(context)=>/* @__PURE__ */(0,import_jsx_runtime111.jsx)(DataGrid.NumberCell,{context,min:0,placeholder:"Pieces"})'
  )
  if (source.includes('id:"starting_stock"') && !source.includes('id:"inventory_warehouse"')) {
    const warehouseColumn = `columnHelper6.column({id:"inventory_warehouse",name:"Warehouse",header:"Warehouse",field:(context)=>\`variants.\${context.row.original.originalIndex}.inventory_warehouse\`,type:"text",cell:(context)=>/* @__PURE__ */(0,import_jsx_runtime111.jsx)(DataGrid.TextCell,{context})}),`
    source = source.replace('columnHelper6.column({id:"starting_stock",', warehouseColumn + 'columnHelper6.column({id:"starting_stock",')
  }

  // Medusa's production Admin uses a route-specific minified module rather
  // than app.js. Patch that module's variants grid as well.
  if (source.includes('B.column({id:"inventory_kit"') && !source.includes('id:"inventory_warehouse"')) {
    const columns = 'B.column({id:"inventory_warehouse",name:"Warehouse",header:"Warehouse",field:n=>`variants.${n.row.original.originalIndex}.inventory_warehouse`,type:"text",cell:n=>e.jsx(H.TextCell,{context:n})}),B.column({id:"starting_stock",name:"Inventory quantity",header:"Inventory quantity",field:n=>`variants.${n.row.original.originalIndex}.initial_stock`,type:"number",cell:n=>e.jsx(H.NumberCell,{context:n,min:0,placeholder:"Pieces"})}),' 
    source = source.replace('}),...ft({currencies:s,regions:a,pricePreferences:r,getFieldName:', '}),' + columns + '...ft({currencies:s,regions:a,pricePreferences:r,getFieldName:')
  }
  if (source.includes('columnHelper2.column({') && source.includes('id: "inventory_kit"') && !source.includes('id: "inventory_warehouse"')) {
    const columns = `      columnHelper2.column({
        id: "inventory_warehouse",
        name: "Warehouse",
        header: "Warehouse",
        field: (context) => \`variants.\${context.row.original.originalIndex}.inventory_warehouse\`,
        type: "text",
        cell: (context) => /* @__PURE__ */ jsx11(DataGrid.TextCell, { context })
      }),
      columnHelper2.column({
        id: "starting_stock",
        name: "Inventory quantity",
        header: "Inventory quantity",
        field: (context) => \`variants.\${context.row.original.originalIndex}.initial_stock\`,
        type: "number",
        cell: (context) => /* @__PURE__ */ jsx11(DataGrid.NumberCell, { context, min: 0, placeholder: "Pieces" })
      }),
`
    source = source.replace('      ...createDataGridPriceColumns({', columns + '      ...createDataGridPriceColumns({')
  }

  if (source.includes('var ProductCreateVariantsForm =') && !source.includes('var WarehouseSelectCell =')) {
    source = source.replace(
      'import { useMemo as useMemo3 } from "react";',
      'import { useEffect as useStockEffect, useMemo as useMemo3, useState as useStockState } from "react";\nimport { Select as StockSelect } from "@medusajs/ui";\nimport { Controller as StockController } from "react-hook-form";'
    )
    source = source.replace(
      '  const { setCloseOnEscape } = useRouteModal();',
      '  const { setCloseOnEscape } = useRouteModal();\n  const [stockLocations, setStockLocations] = useStockState([]);\n  useStockEffect(() => { fetch("/admin/stock-locations?limit=1000", { credentials: "include" }).then((res) => res.ok ? res.json() : Promise.reject()).then((data) => setStockLocations(data.stock_locations || [])).catch(() => setStockLocations([])); }, []);'
    )
    source = source.replace(
      '    regions,\n    pricePreferences\n  });',
      '    regions,\n    pricePreferences,\n    form,\n    stockLocations\n  });'
    )
    source = source.replace(
      '  pricePreferences = []\n}) => {',
      '  pricePreferences = [],\n  form,\n  stockLocations = []\n}) => {'
    )
    source = source.replace(
      'cell: (context) => /* @__PURE__ */ jsx11(DataGrid.TextCell, { context })\n      }),\n      columnHelper2.column({\n        id: "starting_stock"',
      'cell: (context) => /* @__PURE__ */ jsx11(WarehouseSelectCell, { context, form, locations: stockLocations })\n      }),\n      columnHelper2.column({\n        id: "starting_stock"'
    )
    source = source.replace(
      '[currencies, regions, options, pricePreferences, t]\n  );\n};',
      '[currencies, regions, options, pricePreferences, t, form, stockLocations]\n  );\n};'
    )
    source = source.replace(
      'var columnHelper2 = createDataGridHelper();',
      `var WarehouseSelectCell = ({ context, form, locations }) => {
  const fieldName = \`variants.\${context.row.original.originalIndex}.inventory_warehouse\`;
  return /* @__PURE__ */ jsx11(StockController, { control: form.control, name: fieldName, render: ({ field }) => /* @__PURE__ */ jsx11(StockSelect, { value: field.value || void 0, onValueChange: field.onChange, children: [/* @__PURE__ */ jsx11(StockSelect.Trigger, { className: "h-full w-full rounded-none bg-transparent shadow-none", children: /* @__PURE__ */ jsx11(StockSelect.Value, { placeholder: "Select warehouse" }) }), /* @__PURE__ */ jsx11(StockSelect.Content, { children: locations.map((location) => /* @__PURE__ */ jsx11(StockSelect.Item, { value: location.id, children: location.name }, location.id)) })] }) });
};
var columnHelper2 = createDataGridHelper();`
    )
  }
  source = source.replace(
    /(columnHelper6\.column\(\{id:"starting_stock"[\s\S]*?placeholder:"Pieces"\}\)\}\),)(?:\1)+/g,
    '$1'
  )
  // The schema and normalizer share a production chunk. Do not infer schema
  // presence from references elsewhere in that chunk.
  source = source.replace(/\s*initial_stock: (?:import_zod4\.)?z\.union\(\[[^\n]*?\]\)\.optional\(\),/g, '')
  source = source.replace(/(?:\s*inventory_warehouse: (?:import_zod4\.)?z\.string\(\)\.optional\(\),|\s*initial_stock: (?:import_zod4\.)?z\.string\(\)\.optional\(\),)+/g, '')
  source = source.replace(/inventory_kit: ((?:import_zod4\.)?z)\.boolean\(\)\.optional\(\),/g, (_, z) => `inventory_kit: ${z}.boolean().optional(),
    inventory_warehouse: ${z}.string().optional(),
    initial_stock: ${z}.union([${z}.string(), ${z}.number()]).optional(),`)
  source = source.replace('location_id: variant.inventory_warehouse }', 'location_id: variant.inventory_warehouse, variant_rank: variant.variant_rank }')
  source = source.replace('manage_inventory: !!variant.manage_inventory,', 'manage_inventory: !!variant.manage_inventory || (variant.initial_stock !== undefined && variant.initial_stock !== ""),')
  if (source.includes('var normalizeProductFormValues = (values) => {') && !source.includes('STOCK_INPUT_VALIDATION')) {
    source = source.replace('var normalizeProductFormValues = (values) => {', `var normalizeProductFormValues = (values) => {
      /* STOCK_INPUT_VALIDATION */
      for (const variant of values.variants.filter(v => v.should_create)) {
        if (variant.initial_stock === undefined || variant.initial_stock === "") continue;
        if (!Number.isSafeInteger(Number(variant.initial_stock)) || Number(variant.initial_stock) < 0) throw new Error("Inventory quantity must be a non-negative whole number");
        if (!variant.inventory_warehouse) throw new Error("Select a warehouse for each variant with inventory quantity");
        if (variant.inventory_kit) throw new Error("Starting stock is not supported for inventory kits; update the kit components instead");
      }`)
  }
  return source
}

function run() {
  const root = path.resolve(__dirname, '..', 'node_modules')
  const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(file) : [file]
  }) : []
  for (const dir of ['@medusajs/dashboard/src/routes/products/product-create', '@medusajs/dashboard/dist', '.vite/deps']) {
    for (const file of walk(path.join(root, dir)).filter(file => /\.(tsx?|m?js)$/.test(file))) {
      const original = fs.readFileSync(file, 'utf8')
      const patched = patchProductCreate(original)
      if (patched !== original) fs.writeFileSync(file, patched)
    }
  }
}

module.exports = { patchProductCreate, run }
if (require.main === module) run()
