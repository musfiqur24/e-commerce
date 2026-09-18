import { z } from "zod"
import { ProductPdfField } from "../components/product-pdf-field"

const unstable_defineCustomFieldsConfig = <TConfig,>(config: TConfig) => config

const PRODUCT_PDF_KEY = "product_pdf"

const productPdfSchema = z
  .object({
    url: z.string(),
    file_name: z.string(),
    file_id: z.string().optional(),
    uploaded_at: z.string().optional(),
  })
  .nullable()
  .optional()

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const defaultProductPdf = (product?: { metadata?: Record<string, unknown> | null }) => {
  const value = product?.metadata?.[PRODUCT_PDF_KEY]

  if (!isRecord(value) || typeof value.url !== "string") {
    return null
  }

  return {
    url: value.url,
    file_name:
      typeof value.file_name === "string" ? value.file_name : "Product PDF",
    file_id: typeof value.file_id === "string" ? value.file_id : undefined,
    uploaded_at:
      typeof value.uploaded_at === "string" ? value.uploaded_at : undefined,
  }
}

export default unstable_defineCustomFieldsConfig({
  model: "product",
  link: [],
  forms: [
    {
      zone: "edit",
      fields: {
        product_pdf: {
          label: "Product PDF",
          description: "Attach one PDF to this product.",
          validation: productPdfSchema,
          defaultValue: defaultProductPdf,
          component: ProductPdfField,
        },
      },
    },
  ],
})
