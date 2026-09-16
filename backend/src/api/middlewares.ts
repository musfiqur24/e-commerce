import { defineMiddlewares } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

const PRODUCT_PDF_KEY = "product_pdf";
const MEDICATION_FORM_STRENGTH_KEY = "medication_form_strength";

const productCustomFieldsAdditionalDataValidator = {
  [PRODUCT_PDF_KEY]: z
    .object({
      url: z.string(),
      file_name: z.string(),
      file_id: z.string().optional(),
      uploaded_at: z.string().optional(),
    })
    .nullable()
    .optional(),
  [MEDICATION_FORM_STRENGTH_KEY]: z.string().nullish(),
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasProductCustomField = (value: Record<string, unknown>) => {
  return PRODUCT_PDF_KEY in value || MEDICATION_FORM_STRENGTH_KEY in value;
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

    if (MEDICATION_FORM_STRENGTH_KEY in source) {
      customFieldData[MEDICATION_FORM_STRENGTH_KEY] =
        source[MEDICATION_FORM_STRENGTH_KEY];
    }
  }

  return hasProductCustomField(customFieldData) ? customFieldData : null;
};

const mergeProductCustomFieldsIntoMetadata = (req, _res, next) => {
  const mergePayload = (payload: unknown) => {
    if (!isRecord(payload)) {
      return payload;
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

    if (MEDICATION_FORM_STRENGTH_KEY in customFieldData) {
      const medicationFormStrength =
        customFieldData[MEDICATION_FORM_STRENGTH_KEY];

      if (typeof medicationFormStrength === "string") {
        const trimmedValue = medicationFormStrength.trim();

        if (trimmedValue) {
          metadata[MEDICATION_FORM_STRENGTH_KEY] = trimmedValue;
        } else {
          delete metadata[MEDICATION_FORM_STRENGTH_KEY];
        }
      } else if (
        medicationFormStrength === null ||
        medicationFormStrength === undefined
      ) {
        delete metadata[MEDICATION_FORM_STRENGTH_KEY];
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
