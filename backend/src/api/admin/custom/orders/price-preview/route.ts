import {
  createCartWorkflow,
  updateCartPromotionsWorkflowId,
} from "@medusajs/core-flows";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  Modules,
  PromotionActions,
} from "@medusajs/framework/utils";

type PreviewItem = {
  productId?: string;
  variantId?: string;
  name?: string;
  quantity?: number;
  price?: number;
};

type PricePreviewBody = {
  contact?: {
    email?: string;
    customerId?: string;
  };
  items?: PreviewItem[];
  shipping?: number;
  discountCode?: string | null;
  currencyCode?: string;
};

type CartAdjustment = {
  code?: string;
  amount?: unknown;
  promotion_id?: string;
};

type PreviewCart = {
  id: string;
  total?: unknown;
  subtotal?: unknown;
  discount_total?: unknown;
  item_subtotal?: unknown;
  original_item_subtotal?: unknown;
  shipping_total?: unknown;
  original_shipping_total?: unknown;
  currency_code?: string;
  promotions?: Array<{
    id?: string;
    code?: string;
    application_method?: {
      type?: string;
      value?: unknown;
    };
  }>;
  items?: Array<{
    adjustments?: CartAdjustment[];
  }>;
  shipping_methods?: Array<{
    adjustments?: CartAdjustment[];
  }>;
};

type PreviewPromotion = {
  code?: string;
  status?: string;
  is_automatic?: boolean;
  type?: string;
  rules?: Array<{ id?: string }>;
  application_method?: {
    target_type?: string;
    allocation?: string;
    max_quantity?: unknown;
    type?: string;
    value?: unknown;
    target_rules?: Array<{ id?: string }>;
    buy_rules?: Array<{ id?: string }>;
  };
};

const toCurrencyAmount = (amount: number | undefined): number => {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round((amount as number) * 100) / 100;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object") {
    const withToNumber = value as { toNumber?: () => number };
    if (typeof withToNumber.toNumber === "function") {
      return toNumber(withToNumber.toNumber());
    }

    const record = value as Record<string, unknown>;
    if ("value" in record) {
      return toNumber(record.value);
    }
  }

  return 0;
};

const isValidItem = (item: PreviewItem): boolean => {
  return (
    typeof item.variantId === "string" &&
    Number.isFinite(item.quantity) &&
    (item.quantity ?? 0) > 0 &&
    Number.isFinite(item.price) &&
    (item.price ?? 0) >= 0
  );
};

const collectAdjustments = (cart: PreviewCart): CartAdjustment[] => {
  return [
    ...(cart.items ?? []).flatMap((item) => item.adjustments ?? []),
    ...(cart.shipping_methods ?? []).flatMap(
      (method) => method.adjustments ?? []
    ),
  ];
};

const getDiscountLabel = (
  methodType: string | undefined,
  methodValue: number,
  discountAmount: number
) => {
  if (methodType === "percentage" && methodValue > 0) {
    return `${methodValue}% off`;
  }

  if (methodType === "fixed" && methodValue > 0) {
    return `$${discountAmount.toFixed(2)} off`;
  }

  return `$${discountAmount.toFixed(2)} off`;
};

const getNoAdjustmentReason = async (
  req: MedusaRequest<PricePreviewBody>,
  discountCode: string
) => {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "promotion",
      fields: [
        "id",
        "code",
        "status",
        "is_automatic",
        "type",
        "rules.id",
        "application_method.target_type",
        "application_method.allocation",
        "application_method.max_quantity",
        "application_method.type",
        "application_method.value",
        "application_method.target_rules.id",
        "application_method.buy_rules.id",
      ],
      filters: { code: [discountCode] },
    });
    const promotion = data[0] as unknown as PreviewPromotion | undefined;
    const method = promotion?.application_method;

    if (!promotion) {
      return "Discount code is not valid";
    }

    if (promotion.status && promotion.status !== "active") {
      return "Discount code is not active";
    }

    if (promotion.is_automatic) {
      return "This discount is automatic and cannot be entered as a code";
    }

    if (
      method?.allocation === "once" &&
      toNumber(method.max_quantity) <= 0
    ) {
      return "This promotion is set to Once but has no maximum quantity, so Medusa applies it to zero items";
    }

    if (promotion.type === "buyget") {
      return "This buy-get promotion did not match the current cart quantities or target items";
    }

    if (method?.target_type === "items" && method.target_rules?.length) {
      return "This product discount did not match the items in the cart";
    }

    if (method?.target_type === "shipping_methods") {
      return "This shipping discount did not match the checkout shipping method";
    }

    if (promotion.rules?.length) {
      return "This discount code has conditions that did not match this order";
    }
  } catch (err) {
    console.warn("[orders price preview] Promotion diagnostic failed:", err);
  }

  return "Medusa accepted the code but calculated no discount for this order";
};

export async function POST(
  req: MedusaRequest<PricePreviewBody>,
  res: MedusaResponse
) {
  const body = req.body;
  const items = body.items?.filter(isValidItem) ?? [];
  const discountCode = body.discountCode?.trim();
  const shipping = toCurrencyAmount(body.shipping ?? 0);
  const currencyCode = (body.currencyCode || process.env.EWAY_CURRENCY || "AUD")
    .toLowerCase();
  let previewCartId: string | null = null;

  if (!items.length) {
    return res.status(400).json({ error: "At least one cart item is required" });
  }

  if (!discountCode) {
    return res.status(400).json({ error: "discountCode is required" });
  }

  try {
    const { result: createdCart } = await createCartWorkflow(req.scope).run({
      input: {
        customer_id: body.contact?.customerId,
        currency_code: currencyCode,
        items: items.map((item) => ({
          variant_id: item.variantId as string,
          product_id: item.productId,
          title: item.name,
          quantity: item.quantity as number,
          unit_price: toCurrencyAmount(item.price),
          is_discountable: true,
          is_tax_inclusive: false,
          metadata: {
            source: "client_portal_discount_preview",
            product_id: item.productId,
            display_name: item.name,
          },
        })),
        metadata: {
          source: "client_portal_discount_preview",
        },
      },
    });

    previewCartId = createdCart.id;

    if (shipping > 0) {
      const cartModule = req.scope.resolve(Modules.CART) as {
        addShippingMethods: (
          cartId: string,
          methods: Array<{
            name: string;
            amount: number;
            data?: Record<string, unknown>;
          }>
        ) => Promise<unknown>;
      };

      await cartModule.addShippingMethods(createdCart.id, [
        {
          name: "Shipping",
          amount: shipping,
          data: {
            source: "client_portal_discount_preview",
          },
        },
      ]);
    }

    const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE) as {
      run: (
        workflowId: string,
        data: {
          input: {
            cart_id: string;
            promo_codes: string[];
            action: PromotionActions;
            force_refresh_payment_collection: boolean;
          };
        }
      ) => Promise<unknown>;
    };

    await workflowEngine.run(updateCartPromotionsWorkflowId, {
      input: {
        cart_id: createdCart.id,
        promo_codes: [discountCode],
        action: PromotionActions.REPLACE,
        force_refresh_payment_collection: false,
      },
    });

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "total",
        "subtotal",
        "discount_total",
        "item_subtotal",
        "original_item_subtotal",
        "shipping_total",
        "original_shipping_total",
        "currency_code",
        "promotions.id",
        "promotions.code",
        "promotions.application_method.type",
        "promotions.application_method.value",
        "items.adjustments.code",
        "items.adjustments.amount",
        "items.adjustments.promotion_id",
        "shipping_methods.adjustments.code",
        "shipping_methods.adjustments.amount",
        "shipping_methods.adjustments.promotion_id",
      ],
      filters: { id: createdCart.id },
    });
    const cart = data[0] as unknown as PreviewCart;

    const adjustments = collectAdjustments(cart);
    const normalizedCode = discountCode.toLowerCase();
    const codeAdjustments = adjustments.filter(
      (adjustment) => adjustment.code?.toLowerCase() === normalizedCode
    );

    if (!codeAdjustments.length) {
      return res.status(400).json({
        error: await getNoAdjustmentReason(req, discountCode),
      });
    }

    const discountAmount = toCurrencyAmount(
      codeAdjustments.reduce(
        (sum, adjustment) => sum + toNumber(adjustment.amount),
        0
      )
    );

    if (discountAmount <= 0) {
      return res.status(400).json({
        error: "Discount code cannot be applied to this order",
      });
    }

    const promotion =
      cart.promotions?.find(
        (candidate) => candidate.code?.toLowerCase() === normalizedCode
      ) ?? cart.promotions?.[0];
    const methodType = promotion?.application_method?.type;
    const methodValue = toNumber(promotion?.application_method?.value);
    const subtotal = toCurrencyAmount(
      toNumber(cart.original_item_subtotal ?? cart.item_subtotal)
    );
    const shippingTotal = toCurrencyAmount(
      toNumber(cart.original_shipping_total ?? cart.shipping_total)
    );
    const total = toCurrencyAmount(
      Math.max(0, subtotal + shippingTotal - discountAmount)
    );

    res.status(200).json({
      discount: {
        code: promotion?.code ?? discountCode.toUpperCase(),
        promotionId:
          codeAdjustments[0]?.promotion_id ?? promotion?.id ?? discountCode,
        type:
          methodType === "fixed" || methodType === "percentage"
            ? methodType
            : "medusa",
        value: methodValue,
        amount: discountAmount,
        label: getDiscountLabel(methodType, methodValue, discountAmount),
      },
      totals: {
        subtotal,
        shipping: shippingTotal,
        discount: discountAmount,
        total,
      },
      cartId: cart.id,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Discount preview failed";

    res.status(400).json({ error: message });
  } finally {
    if (previewCartId) {
      try {
        const cartModule = req.scope.resolve(Modules.CART) as {
          deleteCarts: (cartId: string) => Promise<void>;
        };
        await cartModule.deleteCarts(previewCartId);
      } catch (err) {
        console.warn("[orders price preview] Cart cleanup failed:", err);
      }
    }
  }
}
