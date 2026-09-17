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
