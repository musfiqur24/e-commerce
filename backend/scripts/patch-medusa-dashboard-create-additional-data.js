const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")
const dashboardRoot = path.join(
  root,
  "node_modules",
  "@medusajs",
  "dashboard"
)

const sourceUtilsTarget = path.join(
  dashboardRoot,
  "src",
  "routes",
  "products",
  "product-create",
  "utils.ts"
)

const sourceFormTarget = path.join(
  dashboardRoot,
  "src",
  "routes",
  "products",
  "product-create",
  "components",
  "product-create-form",
  "product-create-form.tsx"
)

const sourceDetailsFormTarget = path.join(
  dashboardRoot,
  "src",
  "routes",
  "products",
  "product-create",
  "components",
  "product-create-details-form",
  "product-create-details-form.tsx"
)

const sourceGeneralSectionTarget = path.join(
  dashboardRoot,
  "src",
  "routes",
  "products",
  "product-create",
  "components",
  "product-create-details-form",
  "components",
  "product-create-details-general-section",
  "product-create-general-section.tsx"
)

const sourceVariantsSectionTarget = path.join(
  dashboardRoot,
  "src",
  "routes",
  "products",
  "product-create",
  "components",
  "product-create-details-form",
  "components",
  "product-create-details-variant-section",
  "product-create-details-variant-section.tsx"
)

const sourceProductDetailConstantsTarget = path.join(
  dashboardRoot,
  "src",
  "routes",
  "products",
  "product-detail",
  "constants.ts"
)

const sourceProductDetailGeneralTarget = path.join(
  dashboardRoot,
  "src",
  "routes",
  "products",
  "product-detail",
  "components",
  "product-general-section",
  "product-general-section.tsx"
)

const distDir = path.join(dashboardRoot, "dist")
const viteDepsDir = path.join(root, "node_modules", ".vite", "deps")
const builtAdminAssetsDir = path.join(
  root,
  ".medusa",
  "server",
  "public",
  "admin",
  "assets"
)

const counts = {
  source: 0,
  dist: 0,
  vite: 0,
  built: 0,
}

const readFile = (file) => fs.readFileSync(file, "utf8")
const writeFile = (file, source) => fs.writeFileSync(file, source)

const walkFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return []
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)

    return entry.isDirectory() ? walkFiles(file) : file
  })
}

const patchFile = (file, bucket, patcher) => {
  if (!fs.existsSync(file)) {
    return
  }

  const source = readFile(file)
  const patched = patcher(source, file)

  if (patched !== source) {
    writeFile(file, patched)
    counts[bucket] += 1
  }
}

const patchNormalizeProductValues = (source) => {
  source = source.replace(
    /description: values\.description\?\.trim\(\),\n(\s*)(?:metadata: values\.additional_data,\n\s*)?(?:additional_data: values\.additional_data,\n\s*)?discountable: values\.discountable,/,
    "description: values.description?.trim(),\n$1metadata: values.additional_data,\n$1additional_data: values.additional_data,\n$1discountable: values.discountable,"
  )

  source = source.replace(
    /description: \(([A-Za-z_$][\w$]*) = values\.description\) == null \? void 0 : \1\.trim\(\),\n(\s*)(?:metadata: values\.additional_data,\n\s*)?(?:additional_data: values\.additional_data,\n\s*)?discountable: values\.discountable,/,
    "description: ($1 = values.description) == null ? void 0 : $1.trim(),\n$2metadata: values.additional_data,\n$2additional_data: values.additional_data,\n$2discountable: values.discountable,"
  )

  return source
}

const patchSourceCreateUtils = () => {
  patchFile(sourceUtilsTarget, "source", (source) => {
    if (!source.includes("additional_data?: Record<string, unknown>")) {
      source = source.replace(
        "regionsCurrencyMap: Record<string, string>\n  }",
        "regionsCurrencyMap: Record<string, string>\n    additional_data?: Record<string, unknown>\n  }"
      )
    }

    return patchNormalizeProductValues(source)
  })
}

const sourceAdditionalDataBlock =
  'const additionalData =\n      tab === Tab.DETAILS\n        ? form.getValues("additional_data")\n        : latestAdditionalDataRef.current ?? form.getValues("additional_data")'

const patchSourceCreateForm = () => {
  patchFile(sourceFormTarget, "source", (source) => {
    source = source.replace(
      'import { useEffect, useMemo, useState } from "react"',
      'import { useEffect, useMemo, useRef, useState } from "react"'
    )

    if (!source.includes("latestAdditionalDataRef")) {
      source = source.replace(
        "  })\n\n  const { mutateAsync, isPending } = useCreateProduct()",
        '  })\n  const watchedAdditionalData = useWatch({\n    control: form.control,\n    name: "additional_data",\n  })\n  const latestAdditionalDataRef = useRef(watchedAdditionalData)\n\n  const { mutateAsync, isPending } = useCreateProduct()'
      )
    }

    source = source.replace(
      '  useEffect(() => {\n    if (watchedAdditionalData !== undefined) {\n      latestAdditionalDataRef.current = watchedAdditionalData\n    }\n  }, [watchedAdditionalData])',
      '  useEffect(() => {\n    if (tab === Tab.DETAILS && watchedAdditionalData !== undefined) {\n      latestAdditionalDataRef.current = watchedAdditionalData\n    }\n  }, [tab, watchedAdditionalData])'
    )

    if (
      source.includes("latestAdditionalDataRef") &&
      !source.includes("tab === Tab.DETAILS && watchedAdditionalData !== undefined")
    ) {
      source = source.replace(
        "  const handleSubmit = form.handleSubmit(async (values, e) => {",
        '  useEffect(() => {\n    if (tab === Tab.DETAILS && watchedAdditionalData !== undefined) {\n      latestAdditionalDataRef.current = watchedAdditionalData\n    }\n  }, [tab, watchedAdditionalData])\n\n  const handleSubmit = form.handleSubmit(async (values, e) => {'
      )
    }

    source = source.replace(
      "const media = values.media || []\n    const payload = { ...values, media: undefined }",
      `const media = values.media || []\n    ${sourceAdditionalDataBlock}\n    const payload = { ...values, additional_data: additionalData, media: undefined }`
    )

    source = source.replace(
      'const additionalData = form.getValues("additional_data")',
      sourceAdditionalDataBlock
    )

    source = source.replace(
      'const additionalData =\n      latestAdditionalDataRef.current ?? form.getValues("additional_data")',
      sourceAdditionalDataBlock
    )

    return source
  })
}

// Clean details form of medication_form_strength
const cleanSourceCreateDetailsForm = () => {
  patchFile(sourceDetailsFormTarget, "source", (source) => {
    // Remove strengthFields filter
    source = source.replace(
      /const strengthFields = fields\.filter\(\s*\(field\) => field\.name === "medication_form_strength"\s*\)\s*const remainingFields = fields\.filter\(\s*\(field\) => field\.name !== "medication_form_strength"\s*\)/g,
      ""
    )
    source = source.replace(
      /<ProductCreateGeneralSection\s+form=\{form\}\s+strengthFields=\{strengthFields\}\s*\/>/g,
      "<ProductCreateGeneralSection form={form} />"
    )
    source = source.replace(
      /<FormExtensionZone fields=\{remainingFields\} form=\{form\} \/>/g,
      "<FormExtensionZone fields={fields} form={form} />"
    )
    return source
  })
}

// Clean general section of medication_form_strength
const cleanSourceCreateGeneralSection = () => {
  patchFile(sourceGeneralSectionTarget, "source", (source) => {
    source = source.replace(
      /import \{ FormExtensionZone \} from "[^"]+dashboard-app"\nimport type \{ FormField \} from "[^"]+dashboard-app\/types"\n/g,
      ""
    )
    source = source.replace(
      /strengthFields\?: FormField\[\]\n/g,
      ""
    )
    source = source.replace(
      /strengthFields = \[\],\n/g,
      ""
    )
    source = source.replace(
      /\{strengthFields\.length > 0 && \(\s*<FormExtensionZone fields=\{strengthFields\} form=\{form\} \/>\s*\)\}\n/g,
      ""
    )
    return source
  })
}

// Clean product detail general section of medication_form_strength
const cleanSourceProductDetail = () => {
  patchFile(sourceProductDetailConstantsTarget, "source", (source) => {
    return source.replace(
      '"*categories,*shipping_profile,-variants"',
      '"*categories,*shipping_profile,metadata,-variants"'
    )
  })

  patchFile(sourceProductDetailGeneralTarget, "source", (source) => {
    source = source.replace(
      /const medicationFormStrength =\s+typeof product\.metadata\?\.medication_form_strength === "string"\s+\? product\.metadata\.medication_form_strength\s+: null\n/g,
      ""
    )
    source = source.replace(
      /<SectionRow\s+title="Medication Form\/Strength"\s+value=\{medicationFormStrength \|\| null\}\s*\/>\n/g,
      ""
    )
    return source
  })
}

const patchProductCreateRoute = (source) => {
  if (
    !source.includes("useCreateProduct") ||
    !source.includes("normalizeProductFormValues")
  ) {
    return source
  }

  source = source.replace(
    'import { useEffect as useEffect2, useMemo as useMemo4, useState as useState4 } from "react";',
    'import { useEffect as useEffect2, useMemo as useMemo4, useRef as useRef2, useState as useState4 } from "react";'
  )

  const isCjsBundle = source.includes("import_react_hook_form18")
  const isViteBundle = source.includes("var import_react =")
  const indent = isCjsBundle ? "      " : "  "
  const bodyIndent = `${indent}  `
  const watchCall = isCjsBundle
    ? "(0, import_react_hook_form18.useWatch)"
    : source.includes("useWatch4")
      ? "useWatch4"
      : "useWatch"
  const refCall = isCjsBundle
    ? "(0, import_react112.useRef)"
    : isViteBundle
      ? "(0, import_react.useRef)"
      : "useRef2"
  const effectCall = isCjsBundle
    ? "(0, import_react112.useEffect)"
    : isViteBundle
      ? "(0, import_react.useEffect)"
      : "useEffect2"

  const mutateLine = `${indent}const { mutateAsync, isPending } = useCreateProduct();`

  if (!source.includes("latestAdditionalDataRef")) {
    source = source.replace(
      mutateLine,
      `${indent}const watchedAdditionalData = ${watchCall}({\n${indent}  control: form.control,\n${indent}  name: "additional_data"\n${indent}});\n${indent}const latestAdditionalDataRef = ${refCall}(watchedAdditionalData);\n${mutateLine}`
    )
  }

  const guardedEffect = `${indent}${effectCall}(() => {\n${indent}  if (tab === "details" && watchedAdditionalData !== void 0) {\n${indent}    latestAdditionalDataRef.current = watchedAdditionalData;\n${indent}  }\n${indent}}, [tab, watchedAdditionalData]);`

  source = source.replace(
    `${indent}${effectCall}(() => {\n${indent}  if (watchedAdditionalData !== void 0) {\n${indent}    latestAdditionalDataRef.current = watchedAdditionalData;\n${indent}  }\n${indent}}, [watchedAdditionalData]);`,
    guardedEffect
  )

  if (
    source.includes("latestAdditionalDataRef") &&
    !source.includes('tab === "details" && watchedAdditionalData !== void 0')
  ) {
    source = source.replace(
      `${indent}const handleSubmit = form.handleSubmit(async (values, e) => {`,
      `${guardedEffect}\n${indent}const handleSubmit = form.handleSubmit(async (values, e) => {`
    )
  }

  const additionalDataLine = `${bodyIndent}const additionalData = tab === "details" ? form.getValues("additional_data") : latestAdditionalDataRef.current ?? form.getValues("additional_data");`

  source = source.replace(
    `${bodyIndent}const payload = { ...values, media: void 0 };`,
    `${additionalDataLine}\n${bodyIndent}const payload = { ...values, additional_data: additionalData, media: void 0 };`
  )

  source = source.replace(
    `${bodyIndent}const additionalData = form.getValues("additional_data");`,
    additionalDataLine
  )

  source = source.replace(
    `${bodyIndent}const additionalData = latestAdditionalDataRef.current ?? form.getValues("additional_data");`,
    additionalDataLine
  )

  return source
}

const patchDashboardDist = () => {
  walkFiles(distDir)
    .filter((file) => /\.(mjs|js)$/.test(file))
    .forEach((file) => {
      patchFile(file, "dist", (source) => {
        // Strip medicationFormStrength references
        source = source.replace(
          /const medicationFormStrength = typeof product\.metadata\?\.medication_form_strength === "string" \? product\.metadata\.medication_form_strength : null;/g,
          ""
        )
        source = source.replace(
          /\/\* @__PURE__ \*\/ jsx3\(SectionRow, \{ title: "Medication Form\/Strength", value: medicationFormStrength \|\| null \}\),/g,
          ""
        )
        source = source.replace(
          /\(0, import_jsx_runtime3\.jsx\)\(SectionRow, \{ title: "Medication Form\/Strength", value: medicationFormStrength \|\| null \}\),/g,
          ""
        )
        source = source.replace(
          /strengthFields\.length > 0 && \/\* @__PURE__ \*\/ jsx\(FormExtensionZone, \{ fields: strengthFields, form \}\),/g,
          ""
        )
        source = source.replace(
          /strengthFields\.length > 0 && \(0, import_jsx_runtime\.jsx\)\(FormExtensionZone, \{ fields: strengthFields, form \}\),/g,
          ""
        )
        return patchProductCreateRoute(patchNormalizeProductValues(source))
      })
    })
}

const patchViteDeps = () => {
  walkFiles(viteDepsDir)
    .filter((file) => /\.js$/.test(file))
    .forEach((file) => {
      patchFile(file, "vite", (source) => {
        return patchProductCreateRoute(patchNormalizeProductValues(source))
      })
    })
}

const patchBuiltAdminAssets = () => {
  const normalizeRe =
    /description:\(([^=]+)=([A-Za-z_$][\w$]*)\.description\)==null\?void 0:\1\.trim\(\),(?:metadata:\2\.additional_data,)?(?:additional_data:\2\.additional_data,)?discountable:\2\.discountable,/

  walkFiles(builtAdminAssetsDir)
    .filter((file) => /\.js$/.test(file))
    .forEach((file) => {
      patchFile(file, "built", (source) => {
        return source.replace(
          normalizeRe,
          "description:($1=$2.description)==null?void 0:$1.trim(),metadata:$2.additional_data,additional_data:$2.additional_data,discountable:$2.discountable,"
        )
      })
    })
}

patchSourceCreateUtils()
patchSourceCreateForm()
cleanSourceCreateDetailsForm()
cleanSourceCreateGeneralSection()
cleanSourceProductDetail()
patchDashboardDist()
patchViteDeps()
patchBuiltAdminAssets()
require('./patch-product-create-variants.cjs').run()
require('./patch-product-inventory-column.cjs')
require('./patch-grouped-inventory.cjs')
require('./patch-product-media.cjs')

console.log(
  `[patch-medusa-dashboard] product create additional_data, variant synchronization, and inventory column applied (source: ${counts.source}, dist: ${counts.dist}, vite: ${counts.vite}, built: ${counts.built})`
)
