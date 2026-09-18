import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import productMedia from '../config/product-media.json';

const validateProductImages = (req, res, next) => {
  const body = req.validatedBody || req.body;
  if (Array.isArray(body?.images)) {
    const urls = new Set(body.images.map(image => image.url));
    if (body.thumbnail) urls.add(body.thumbnail);
    if (urls.size > productMedia.maxImages) return res.status(400).json({ message: `A product can have up to ${productMedia.maxImages} images.` });
  }
  next();
};

const PRODUCT_PDF_KEY = "product_pdf";

const productCustomFieldsAdditionalDataValidator = {
  initial_stock: z.object({
    location_id: z.string().min(1).optional(),
    quantities: z.array(z.object({
      options: z.record(z.string(), z.string()),
      quantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
      location_id: z.string().min(1).optional(),
      variant_rank: z.number().int().min(0).optional(),
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
    let record = payload;
    if (isRecord(record.metadata) && 'initial_stock' in record.metadata) {
      const { initial_stock: _stock, ...metadata } = record.metadata;
      record = { ...record, metadata };
    }

    const customFieldData = getProductCustomFields(record);

    if (!customFieldData) {
      return record;
    }

    const metadata = isRecord(record.metadata) ? { ...record.metadata } : {};

    if (PRODUCT_PDF_KEY in customFieldData) {
      const productPdf = customFieldData[PRODUCT_PDF_KEY];

      if (productPdf === null || productPdf === undefined) {
        delete metadata[PRODUCT_PDF_KEY];
      } else {
        metadata[PRODUCT_PDF_KEY] = productPdf;
      }
    }

    return {
      ...record,
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
      middlewares: [validateProductImages, mergeProductCustomFieldsIntoMetadata],
    },
    {
      method: ["POST"],
      matcher: "/admin/products/:id",
      additionalDataValidator: productCustomFieldsAdditionalDataValidator,
      middlewares: [validateProductImages, mergeProductCustomFieldsIntoMetadata],
    },
    {
      method: ["POST"],
      matcher: "/admin/products/:id/restock",
      middlewares: [validateAndTransformBody(z.object({
        location_id: z.string().min(1),
        adjustments: z.array(z.object({
          variant_id: z.string().min(1),
          quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
        })).min(1),
      }))],
    },
    {
      matcher: "/admin/custom",
      middlewares: [],
    },
  ],
});
