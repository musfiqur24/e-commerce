import { defineMiddlewares } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

const PRODUCT_PDF_KEY = "product_pdf";

const productCustomFieldsAdditionalDataValidator = {
  initial_stock: z.object({
    location_id: z.string().min(1),
    quantities: z.array(z.object({
      options: z.record(z.string(), z.string()),
      quantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    })).min(1),
  }).nullable().optional(),
  [PRODUCT_PDF_KEY]: z
    .object({
      url: z.string(),
      file_name: z.string(),
      file_id: z.string().optional(),
      uploaded_at: z.string().optional(),
    })
    .nullable()
    .optional(),
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasProductCustomField = (value: Record<string, unknown>) => {
  return PRODUCT_PDF_KEY in value;
};

const getProductCustomFields = (payload: Record<string, unknown>) => {
  const metadata = isRecord(payload.metadata) ? payload.metadata : null;
  const additionalData = isRecord(payload.additional_data)
    ? payload.additional_data
    : null;

  const customFieldData: Record<string, unknown> = {};

  for (const source of [metadata, additionalData]) {
    if (!source) {
      continue;
    }

    if (PRODUCT_PDF_KEY in source) {
      customFieldData[PRODUCT_PDF_KEY] = source[PRODUCT_PDF_KEY];
    }
  }

  return hasProductCustomField(customFieldData) ? customFieldData : null;
};

const mergeProductCustomFieldsIntoMetadata = (req, _res, next) => {
  const mergePayload = (payload: unknown) => {
    if (!isRecord(payload)) {
      return payload;
    }

    // Stock is an operation, not persistent product metadata.
    if (isRecord(payload.metadata) && 'initial_stock' in payload.metadata) {
      const { initial_stock: _stock, ...metadata } = payload.metadata;
      payload = { ...payload, metadata };
    }

    const customFieldData = getProductCustomFields(payload);

    if (!customFieldData) {
      return payload;
    }

    const metadata = isRecord(payload.metadata) ? { ...payload.metadata } : {};

    if (PRODUCT_PDF_KEY in customFieldData) {
      const productPdf = customFieldData[PRODUCT_PDF_KEY];

      if (productPdf === null || productPdf === undefined) {
        delete metadata[PRODUCT_PDF_KEY];
      } else {
        metadata[PRODUCT_PDF_KEY] = productPdf;
      }
    }

    return {
      ...payload,
      metadata,
    };
  };

  req.body = mergePayload(req.body);
  req.validatedBody = mergePayload(req.validatedBody);

  next();
};

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/admin/products",
      additionalDataValidator: productCustomFieldsAdditionalDataValidator,
      middlewares: [mergeProductCustomFieldsIntoMetadata],
    },
    {
      method: ["POST"],
      matcher: "/admin/products/:id",
      additionalDataValidator: productCustomFieldsAdditionalDataValidator,
      middlewares: [mergeProductCustomFieldsIntoMetadata],
    },
    {
      matcher: "/admin/custom",
      middlewares: [],
    },
  ],
});
