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

const patchSourceCreateDetailsForm = () => {
  patchFile(sourceDetailsFormTarget, "source", (source) => {
    if (!source.includes("const strengthFields = fields.filter")) {
      source = source.replace(
        '  const fields = getFormFields("product", "create", "general")',
        '  const fields = getFormFields("product", "create", "general")\n  const strengthFields = fields.filter(\n    (field) => field.name === "medication_form_strength"\n  )\n  const remainingFields = fields.filter(\n    (field) => field.name !== "medication_form_strength"\n  )'
      )
    }

    source = source.replace(
      "          <ProductCreateGeneralSection form={form} />",
      "          <ProductCreateGeneralSection\n            form={form}\n            strengthFields={strengthFields}\n          />"
    )

    source = source.replace(
      "          <FormExtensionZone fields={fields} form={form} />",
      "          <FormExtensionZone fields={remainingFields} form={form} />"
    )

    return source
  })
}

const patchSourceCreateGeneralSection = () => {
  patchFile(sourceGeneralSectionTarget, "source", (source) => {
    if (!source.includes("../../../../../../../dashboard-app")) {
      source = source.replace(
        'import { HandleInput } from "../../../../../../../components/inputs/handle-input"\nimport { ProductCreateSchemaType } from "../../../../types"',
        'import { HandleInput } from "../../../../../../../components/inputs/handle-input"\nimport { FormExtensionZone } from "../../../../../../../dashboard-app"\nimport type { FormField } from "../../../../../../../dashboard-app/types"\nimport { ProductCreateSchemaType } from "../../../../types"'
      )
    }

    source = source.replace(
      "type ProductCreateGeneralSectionProps = {\n  form: UseFormReturn<ProductCreateSchemaType>\n}",
      "type ProductCreateGeneralSectionProps = {\n  form: UseFormReturn<ProductCreateSchemaType>\n  strengthFields?: FormField[]\n}"
    )

    source = source.replace(
      "export const ProductCreateGeneralSection = ({\n  form,\n}: ProductCreateGeneralSectionProps) => {",
      "export const ProductCreateGeneralSection = ({\n  form,\n  strengthFields = [],\n}: ProductCreateGeneralSectionProps) => {"
    )

    if (!source.includes("<FormExtensionZone fields={strengthFields} form={form} />")) {
      source = source.replace(
        '      </div>\n      <Form.Field\n        control={form.control}\n        name="description"',
        '      </div>\n      {strengthFields.length > 0 && (\n        <FormExtensionZone fields={strengthFields} form={form} />\n      )}\n      <Form.Field\n        control={form.control}\n        name="description"'
      )
    }

    return source
  })
}

const patchSourceProductDetail = () => {
  patchFile(sourceProductDetailConstantsTarget, "source", (source) => {
    return source.replace(
      '"*categories,*shipping_profile,-variants"',
      '"*categories,*shipping_profile,metadata,-variants"'
    )
  })

  patchFile(sourceProductDetailGeneralTarget, "source", (source) => {
    if (!source.includes("const medicationFormStrength =")) {
      source = source.replace(
        '  const displays = getDisplays("product", "general")',
        '  const displays = getDisplays("product", "general")\n  const medicationFormStrength =\n    typeof product.metadata?.medication_form_strength === "string"\n      ? product.metadata.medication_form_strength\n      : null'
      )
    }

    if (!source.includes('title="Medication Form/Strength"')) {
      source = source.replace(
        '      <SectionRow title={t("fields.material")} value={product.material} />\n      <SectionRow\n        title={t("fields.discountable")}',
        '      <SectionRow title={t("fields.material")} value={product.material} />\n      <SectionRow\n        title="Medication Form/Strength"\n        value={medicationFormStrength || null}\n      />\n      <SectionRow\n        title={t("fields.discountable")}'
      )
    }

    return source
  })
}

const patchProductCreateFieldLayout = (source) => {
  if (
    !source.includes("ProductCreateDetailsForm") ||
    !source.includes("ProductCreateGeneralSection")
  ) {
    return source
  }

  if (!source.includes("const strengthFields = fields.filter")) {
    source = source.replace(
      '  const fields = getFormFields("product", "create", "general");',
      '  const fields = getFormFields("product", "create", "general");\n  const strengthFields = fields.filter((field) => field.name === "medication_form_strength");\n  const remainingFields = fields.filter((field) => field.name !== "medication_form_strength");'
    )
  }

  source = source.replace(
    "var ProductCreateGeneralSection = ({\n  form\n}) => {",
    "var ProductCreateGeneralSection = ({\n  form,\n  strengthFields = []\n}) => {"
  )

  source = source.replace(
    "ProductCreateGeneralSection, { form }",
    "ProductCreateGeneralSection, { form, strengthFields }"
  )

  source = source.replace(
    "jsx5(FormExtensionZone, { fields, form })",
    "jsx5(FormExtensionZone, { fields: remainingFields, form })"
  )

  source = source.replace(
    "(0, import_jsx_runtime5.jsx)(FormExtensionZone, { fields, form })",
    "(0, import_jsx_runtime5.jsx)(FormExtensionZone, { fields: remainingFields, form })"
  )

  if (
    source.includes("strengthFields = []") &&
    !source.includes("jsx(FormExtensionZone, { fields: strengthFields, form })")
  ) {
    source = source.replace(
      '    ] }) }),\n    /* @__PURE__ */ jsx(\n      Form.Field,\n      {\n        control: form.control,\n        name: "description",',
      '    ] }) }),\n    strengthFields.length > 0 && /* @__PURE__ */ jsx(FormExtensionZone, { fields: strengthFields, form }),\n    /* @__PURE__ */ jsx(\n      Form.Field,\n      {\n        control: form.control,\n        name: "description",'
    )
  }

  if (
    source.includes("strengthFields = []") &&
    !source.includes("import_jsx_runtime.jsx)(FormExtensionZone, { fields: strengthFields, form })")
  ) {
    source = source.replace(
      '    ] }) }),\n    (0, import_jsx_runtime.jsx)(\n      Form.Field,\n      {\n        control: form.control,\n        name: "description",',
      '    ] }) }),\n    strengthFields.length > 0 && (0, import_jsx_runtime.jsx)(FormExtensionZone, { fields: strengthFields, form }),\n    (0, import_jsx_runtime.jsx)(\n      Form.Field,\n      {\n        control: form.control,\n        name: "description",'
    )
  }

  return source
}

const patchProductDetailRoute = (source) => {
  if (
    !source.includes("ProductGeneralSection") ||
    !source.includes("fields.discountable")
  ) {
    return source
  }

  source = source.replace(
    '"*categories,*shipping_profile,-variants"',
    '"*categories,*shipping_profile,metadata,-variants"'
  )

  if (!source.includes("const medicationFormStrength =")) {
    source = source.replace(
      '  const displays = getDisplays("product", "general");',
      '  const displays = getDisplays("product", "general");\n  const medicationFormStrength = typeof product.metadata?.medication_form_strength === "string" ? product.metadata.medication_form_strength : null;'
    )
  }

  if (!source.includes('title: "Medication Form/Strength"')) {
    source = source.replace(
      '    /* @__PURE__ */ jsx3(SectionRow, { title: t("fields.material"), value: product.material }),\n    /* @__PURE__ */ jsx3(\n      SectionRow,\n      {\n        title: t("fields.discountable"),',
      '    /* @__PURE__ */ jsx3(SectionRow, { title: t("fields.material"), value: product.material }),\n    /* @__PURE__ */ jsx3(SectionRow, { title: "Medication Form/Strength", value: medicationFormStrength || null }),\n    /* @__PURE__ */ jsx3(\n      SectionRow,\n      {\n        title: t("fields.discountable"),'
    )

    source = source.replace(
      '    (0, import_jsx_runtime3.jsx)(SectionRow, { title: t("fields.material"), value: product.material }),\n    (0, import_jsx_runtime3.jsx)(\n      SectionRow,\n      {\n        title: t("fields.discountable"),',
      '    (0, import_jsx_runtime3.jsx)(SectionRow, { title: t("fields.material"), value: product.material }),\n    (0, import_jsx_runtime3.jsx)(SectionRow, { title: "Medication Form/Strength", value: medicationFormStrength || null }),\n    (0, import_jsx_runtime3.jsx)(\n      SectionRow,\n      {\n        title: t("fields.discountable"),'
    )
  }

  return source
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

  return patchProductCreateFieldLayout(source)
}

const patchDashboardDist = () => {
  walkFiles(distDir)
    .filter((file) => /\.(mjs|js)$/.test(file))
    .forEach((file) => {
      patchFile(file, "dist", (source) => {
        return patchProductDetailRoute(
          patchProductCreateRoute(patchNormalizeProductValues(source))
        )
      })
    })
}

const patchViteDeps = () => {
  walkFiles(viteDepsDir)
    .filter((file) => /\.js$/.test(file))
    .forEach((file) => {
      patchFile(file, "vite", (source) => {
        return patchProductDetailRoute(
          patchProductCreateRoute(patchNormalizeProductValues(source))
        )
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
patchSourceCreateDetailsForm()
patchSourceCreateGeneralSection()
patchSourceProductDetail()
patchDashboardDist()
patchViteDeps()
patchBuiltAdminAssets()

console.log(
  `[patch-medusa-dashboard] product create forwards additional_data and custom product fields render in admin (source patched: ${counts.source}, dist patched: ${counts.dist}, vite deps patched: ${counts.vite}, built assets patched: ${counts.built})`
)
