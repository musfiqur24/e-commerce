"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftMini,
  ArrowRightMini,
  CheckMini,
  CreditCard,
  LockClosedSolidMini,
  ReceiptPercent,
  ShoppingBag,
} from "@medusajs/icons";
import Script from "next/script";
import PageContainer from "@/components/portal/PageContainer";
import Button from "@/components/portal/Button";
import CartItemCard from "@/components/portal/CartItemCard";
import Toast from "@/components/portal/Toast";
import {
  FloatingInput,
  FloatingTextarea,
} from "@/components/portal/FloatingField";
import { useCart } from "@/context/CartContext";
import { TopImageBanner } from "@/components/portal";
import { getEwayCustomerMessage } from "@/lib/eway-errors";
import { formatAud } from "@/lib/currency";

type EwayFieldType = "name" | "card" | "expiry" | "expirytext" | "cvn";
type EwayFieldStatusKey = "name" | "card" | "expirytext" | "cvn";
type ToastVariant = "info" | "success" | "warning" | "error";
type CheckoutStep = "cart" | "details" | "review";

const CHECKOUT_CONFIRMATION_STORAGE_KEY = "protocol:last-order-confirmation";

const checkoutSteps: Array<{
  id: CheckoutStep;
  label: string;
}> = [
  { id: "cart", label: "Cart" },
  { id: "details", label: "Details" },
  { id: "review", label: "Payment" },
];

interface CheckoutDetails {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  apartment: string;
  suburb: string;
  state: string;
  postcode: string;
  deliveryNotes: string;
  discountCode: string;
}

type CheckoutDetailErrors = Partial<
  Record<keyof CheckoutDetails, string>
>;

const requiredCheckoutFields: Array<keyof CheckoutDetails> = [
  "email",
  "phone",
  "firstName",
  "lastName",
  "address",
  "suburb",
  "state",
  "postcode",
];

function getCheckoutDetailError(
  field: keyof CheckoutDetails,
  value: string,
): string | null {
  const trimmed = value.trim();

  if (requiredCheckoutFields.includes(field) && !trimmed) {
    return "This field is required.";
  }
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  if (field === "phone") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      return "Enter a valid phone number.";
    }
  }
  if (field === "postcode" && !/^\d{4}$/.test(trimmed)) {
    return "Enter a valid 4-digit postcode.";
  }

  return null;
}

interface PayOrderResponse {
  payment?: {
    transactionId?: number;
    responseCode?: string;
    responseMessage?: string;
    authorisationCode?: string;
    totalAmount?: number;
  };
  deals?: Array<{ dealId?: string; category?: string; name?: string }>;
  failures?: Array<{ name?: string; error?: string }>;
  discount?: AppliedDiscount | null;
  totals?: {
    subtotal?: number;
    shipping?: number;
    total?: number;
  };
}

interface AppliedDiscount {
  code: string;
  promotionId: string;
  type: "fixed" | "percentage" | "medusa";
  value: number;
  amount: number;
  label: string;
}

interface DiscountPreviewResponse {
  discount?: AppliedDiscount | null;
  totals?: {
    subtotal?: number;
    shipping?: number;
    total?: number;
  };
  error?: string;
}

interface OrderConfirmation {
  placedAt: string;
  checkoutDetails: CheckoutDetails;
  items: Array<{
    id: string;
    name: string;
    category?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    imageSrc?: string;
  }>;
  totals: {
    subtotal: number;
    shipping: number;
    gst: number;
    discount: number;
    total: number;
  };
  discount?: AppliedDiscount | null;
  payment?: PayOrderResponse["payment"];
  deals?: PayOrderResponse["deals"];
  failures?: PayOrderResponse["failures"];
}

interface EwaySecureFieldEvent {
  secureFieldCode?: string;
  targetField?: EwayFieldType;
  fieldValid?: boolean;
  valueIsSaved?: boolean;
  valueIsValid?: boolean;
  errors?: string | string[];
}

const ewaySecureFields: Array<{
  fieldDivId: string;
  fieldType: EwayFieldType;
}> = [
  { fieldDivId: "eway-secure-field-name", fieldType: "name" },
  { fieldDivId: "eway-secure-field-card", fieldType: "card" },
  { fieldDivId: "eway-secure-field-expiry", fieldType: "expirytext" },
  { fieldDivId: "eway-secure-field-cvn", fieldType: "cvn" },
];

function getEwayErrorMessage(
  errors?: string | string[],
): string | null {
  const rawMessage = Array.isArray(errors)
    ? errors.filter(Boolean).join(", ")
    : errors?.trim();

  if (!rawMessage) return null;

  return (
    getEwayCustomerMessage(rawMessage) ??
    "Please check the highlighted payment field and try again."
  );
}

function toEwayFieldStatusKey(
  field?: EwayFieldType,
): EwayFieldStatusKey | null {
  if (!field) return null;
  if (field === "expiry" || field === "expirytext") return "expirytext";
  return field;
}

declare global {
  interface Window {
    eWAY?: {
      setupSecureField: (
        config: {
          publicApiKey: string;
          fieldDivId: string;
          fieldType: EwayFieldType;
          styles: string;
          autocomplete?: "true" | "false";
        },
        callback: (event: EwaySecureFieldEvent) => void,
      ) => void;
      saveAllFields?: (
        callback: (event?: EwaySecureFieldEvent) => void,
        timeout?: number,
      ) => void;
    };
  }
}

export default function CartPage() {
  const router = useRouter();
  const { cart, subtotal, updateQuantity, removeFromCart, clearCart } =
    useCart();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState(
    "Successfully added to cart",
  );
  const [toastVariant, setToastVariant] = useState<ToastVariant>("success");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [activeStep, setActiveStep] = useState<CheckoutStep>("cart");
  const paymentSubmitRef = useRef<(() => void) | null>(null);
  const [appliedDiscount, setAppliedDiscount] =
    useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [checkoutDetailErrors, setCheckoutDetailErrors] =
    useState<CheckoutDetailErrors>({});
  const [shipping, setShipping] = useState(25.0);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/shipping-fee")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && typeof data?.price === "number") {
          setShipping(data.price);
        }
      })
      .catch((err) => {
        console.error("Failed to load shipping fee:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetails>({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    suburb: "",
    state: "",
    postcode: "",
    deliveryNotes: "",
    discountCode: "",
  });

  const gst = 0.0;
  const discountAmount = appliedDiscount?.amount ?? 0;
  const total = Math.max(0, subtotal + shipping - discountAmount) + gst;
  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );
  const cartSignature = useMemo(
    () =>
      cart
        .map((item) => `${item.product.id}:${item.quantity}`)
        .sort()
        .join("|"),
    [cart],
  );
  const activeStepIndex = checkoutSteps.findIndex(
    (step) => step.id === activeStep,
  );
  const previousCartSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousCartSignatureRef.current === null) {
      previousCartSignatureRef.current = cartSignature;
      return;
    }

    if (previousCartSignatureRef.current !== cartSignature) {
      previousCartSignatureRef.current = cartSignature;
      setAppliedDiscount(null);
      setDiscountError("");
    }
  }, [cartSignature]);

  useEffect(() => {
    let cancelled = false;

    const loadCheckoutContact = async () => {
      try {
        const res = await fetch("/api/checkout/contact", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          contact?: Partial<
            Pick<
              CheckoutDetails,
              | "email"
              | "phone"
              | "firstName"
              | "lastName"
              | "address"
              | "suburb"
              | "state"
              | "postcode"
            >
          >;
        };

        if (!res.ok || cancelled || !data.contact) return;

        setCheckoutDetails((current) => ({
          ...current,
          email: current.email || data.contact?.email || "",
          phone: current.phone || data.contact?.phone || "",
          firstName: current.firstName || data.contact?.firstName || "",
          lastName: current.lastName || data.contact?.lastName || "",
          address: current.address || data.contact?.address || "",
          suburb: current.suburb || data.contact?.suburb || "",
          state: current.state || data.contact?.state || "",
          postcode: current.postcode || data.contact?.postcode || "",
        }));
      } catch {
        // Checkout remains fully editable if the contact lookup is unavailable.
      }
    };

    loadCheckoutContact();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateCheckoutDetail = (
    field: keyof CheckoutDetails,
    value: string,
  ) => {
    if (field === "discountCode") {
      const nextCode = value.trim().toLowerCase();
      const appliedCode = appliedDiscount?.code.trim().toLowerCase();

      if (appliedDiscount && nextCode !== appliedCode) {
        setAppliedDiscount(null);
      }

      setDiscountError("");
    }

    setCheckoutDetailErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setCheckoutDetails((current) => ({ ...current, [field]: value }));
  };

  const validateCheckoutDetail = (field: keyof CheckoutDetails) => {
    const error = getCheckoutDetailError(field, checkoutDetails[field]);
    setCheckoutDetailErrors((current) => {
      const next = { ...current };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const registerPaymentSubmit = React.useCallback(
    (submit: (() => void) | null) => {
      paymentSubmitRef.current = submit;
    },
    [],
  );

  const showStepError = React.useCallback((message: string) => {
    setToastMessage(message);
    setToastVariant("warning");
    setShowToast(true);
  }, []);

  const validateCartStep = () => {
    if (cart.length === 0) {
      showStepError("Add at least one item before continuing.");
      return false;
    }

    const unpricedItem = cart.find((item) => item.product.price <= 0);
    if (unpricedItem) {
      setToastMessage(
        `${unpricedItem.product.name} has no price configured in Medusa.`,
      );
      setToastVariant("error");
      setShowToast(true);
      return false;
    }

    return true;
  };

  const handlePaymentClick = React.useCallback(() => {
    if (checkoutDetails.discountCode.trim() && !appliedDiscount) {
      showStepError("Apply or clear the discount code before paying.");
      return;
    }

    if (!paymentSubmitRef.current) {
      showStepError("Payment fields are still loading. Please try again.");
      return;
    }

    paymentSubmitRef.current();
  }, [appliedDiscount, checkoutDetails.discountCode, showStepError]);

  const applyDiscount = async () => {
    if (isApplyingDiscount) return;

    if (!validateCartStep()) return;

    const discountCode = checkoutDetails.discountCode.trim();
    if (!discountCode) {
      setDiscountError("Enter a discount code.");
      showStepError("Enter a discount code before applying.");
      return;
    }

    setIsApplyingDiscount(true);
    setDiscountError("");

    try {
      const res = await fetch("/api/orders/discount/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountCode,
          items: cart.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
          })),
        }),
      });
      const data = (await res
        .json()
        .catch(() => ({}))) as DiscountPreviewResponse;

      if (!res.ok || !data.discount) {
        throw new Error(data.error || "Discount code could not be applied.");
      }

      setAppliedDiscount(data.discount);
      setCheckoutDetails((current) => ({
        ...current,
        discountCode: data.discount?.code || discountCode,
      }));
      setToastMessage(`${data.discount.code} applied.`);
      setToastVariant("success");
      setShowToast(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Discount code could not be applied.";

      setAppliedDiscount(null);
      setDiscountError(message);
      setToastMessage(message);
      setToastVariant("warning");
      setShowToast(true);
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountError("");
    setCheckoutDetails((current) => ({
      ...current,
      discountCode: "",
    }));
  };

  const validateDetailsStep = () => {
    const errors = requiredCheckoutFields.reduce<CheckoutDetailErrors>(
      (result, field) => {
        const error = getCheckoutDetailError(field, checkoutDetails[field]);
        if (error) result[field] = error;
        return result;
      },
      {},
    );
    setCheckoutDetailErrors(errors);

    if (Object.keys(errors).length > 0) {
      showStepError(
        "Please correct the highlighted contact and delivery fields.",
      );
      return false;
    }

    return true;
  };

  const goToNextStep = () => {
    if (activeStep === "cart" && !validateCartStep()) return;
    if (activeStep === "details" && !validateDetailsStep()) return;

    if (activeStep === "cart") {
      setActiveStep("details");
    } else if (activeStep === "details") {
      setActiveStep("review");
    }
  };

  const goToPreviousStep = () => {
    if (activeStep === "review") {
      setActiveStep("details");
    } else if (activeStep === "details") {
      setActiveStep("cart");
    }
  };

  const placeOrder = async (securedCardData: string) => {
    if (!cart.length || isPlacingOrder) return;
    if (!validateCartStep() || !validateDetailsStep()) {
      throw new Error("Complete checkout details before paying.");
    }

    setIsPlacingOrder(true);
    try {
      const res = await fetch("/api/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          securedCardData,
          discountCode: appliedDiscount?.code,
          items: cart.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
          })),
          shippingAddress: {
            firstName: checkoutDetails.firstName,
            lastName: checkoutDetails.lastName,
            address: checkoutDetails.address,
            apartment: checkoutDetails.apartment,
            suburb: checkoutDetails.suburb,
            state: checkoutDetails.state,
            postcode: checkoutDetails.postcode,
          },
          deliveryNotes: checkoutDetails.deliveryNotes,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as PayOrderResponse & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Order failed");
      }

      const confirmedDiscount = data.discount ?? appliedDiscount;
      const confirmedSubtotal = data.totals?.subtotal ?? subtotal;
      const confirmedShipping = data.totals?.shipping ?? shipping;
      const confirmedTotal = data.totals?.total ?? total;

      const confirmation: OrderConfirmation = {
        placedAt: new Date().toISOString(),
        checkoutDetails,
        items: cart.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          category: item.product.category,
          quantity: item.quantity,
          unitPrice: item.product.price,
          lineTotal: item.product.price * item.quantity,
          imageSrc: item.product.imageSrc,
        })),
        totals: {
          subtotal: confirmedSubtotal,
          shipping: confirmedShipping,
          gst,
          discount: confirmedDiscount?.amount ?? discountAmount,
          total: confirmedTotal,
        },
        discount: confirmedDiscount,
        payment: data.payment,
        deals: data.deals,
        failures: data.failures,
      };

      sessionStorage.setItem(
        CHECKOUT_CONFIRMATION_STORAGE_KEY,
        JSON.stringify(confirmation),
      );

      clearCart();
      setOrderPlaced(true);
      setToastMessage("Payment approved and order placed!");
      setToastVariant("success");
      setShowToast(true);
      router.push("/dashboard/cart/thank-you");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setToastMessage(message);
      setToastVariant("error");
      setShowToast(true);
      throw new Error(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <PageContainer
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Cart" },
      ]}
    >
      <TopImageBanner subtitle="Secure checkout" title=" Complete your order" />
      <div className="mt-6 mx-auto w-full pb-12 space-y-4">
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          <CheckoutProgress
            steps={checkoutSteps}
            activeStepIndex={activeStepIndex}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
            <main className="space-y-6 px-5 py-6 lg:px-7">
              {activeStep === "cart" && (
                <CheckoutPanel
                  eyebrow="Step 1"
                  title="Review cart"
                  description={`${itemCount} item${itemCount === 1 ? "" : "s"} ready for checkout`}
                  action={
                    <Button
                      href="/dashboard/marketplace"
                      variant="secondary"
                      className="h-10 rounded-md border border-neutral-200 bg-white px-4 text-sm text-neutral-700"
                    >
                      Continue Shopping
                    </Button>
                  }
                >
                  {cart.length > 0 ? (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <CartItemCard
                          key={item.product.id}
                          item={item}
                          onUpdateQuantity={updateQuantity}
                          onRemove={removeFromCart}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyCartState />
                  )}
                </CheckoutPanel>
              )}

              {activeStep === "details" && (
                <CheckoutPanel
                  eyebrow="Step 2"
                  title="Delivery details"
                  description="Tell us where to send order updates and delivery."
                >
                  <div className="space-y-6">
                    <section>
                      <SectionHeading title="Contact" />
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <CheckoutField
                          label="Email"
                          type="email"
                          required
                          value={checkoutDetails.email}
                          error={checkoutDetailErrors.email}
                          onBlur={() => validateCheckoutDetail("email")}
                          onChange={(value) =>
                            updateCheckoutDetail("email", value)
                          }
                        />
                        <CheckoutField
                          label="Phone"
                          required
                          value={checkoutDetails.phone}
                          error={checkoutDetailErrors.phone}
                          onBlur={() => validateCheckoutDetail("phone")}
                          onChange={(value) =>
                            updateCheckoutDetail("phone", value)
                          }
                        />
                      </div>
                    </section>

                    <section>
                      <SectionHeading title="Shipping address" />
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <CheckoutField
                          label="First name"
                          required
                          value={checkoutDetails.firstName}
                          error={checkoutDetailErrors.firstName}
                          onBlur={() => validateCheckoutDetail("firstName")}
                          onChange={(value) =>
                            updateCheckoutDetail("firstName", value)
                          }
                        />
                        <CheckoutField
                          label="Last name"
                          required
                          value={checkoutDetails.lastName}
                          error={checkoutDetailErrors.lastName}
                          onBlur={() => validateCheckoutDetail("lastName")}
                          onChange={(value) =>
                            updateCheckoutDetail("lastName", value)
                          }
                        />
                        <CheckoutField
                          label="Street address"
                          required
                          value={checkoutDetails.address}
                          error={checkoutDetailErrors.address}
                          onBlur={() => validateCheckoutDetail("address")}
                          onChange={(value) =>
                            updateCheckoutDetail("address", value)
                          }
                          className="sm:col-span-2"
                        />
                        <CheckoutField
                          label="Apartment, suite, etc."
                          value={checkoutDetails.apartment}
                          onChange={(value) =>
                            updateCheckoutDetail("apartment", value)
                          }
                          className="sm:col-span-2"
                        />
                        <CheckoutField
                          label="City or suburb"
                          required
                          value={checkoutDetails.suburb}
                          error={checkoutDetailErrors.suburb}
                          onBlur={() => validateCheckoutDetail("suburb")}
                          onChange={(value) =>
                            updateCheckoutDetail("suburb", value)
                          }
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <CheckoutField
                            label="State"
                            required
                            value={checkoutDetails.state}
                            error={checkoutDetailErrors.state}
                            onBlur={() => validateCheckoutDetail("state")}
                            onChange={(value) =>
                              updateCheckoutDetail("state", value)
                            }
                          />
                          <CheckoutField
                            label="Postcode"
                            required
                            value={checkoutDetails.postcode}
                            error={checkoutDetailErrors.postcode}
                            onBlur={() => validateCheckoutDetail("postcode")}
                            onChange={(value) =>
                              updateCheckoutDetail("postcode", value)
                            }
                          />
                        </div>
                        <CheckoutTextarea
                          label="Delivery notes"
                          value={checkoutDetails.deliveryNotes}
                          onChange={(value) =>
                            updateCheckoutDetail("deliveryNotes", value)
                          }
                          className="sm:col-span-2"
                        />
                      </div>
                    </section>
                  </div>
                </CheckoutPanel>
              )}

              {activeStep === "review" && (
                <CheckoutPanel
                  eyebrow="Step 3"
                  title="Payment"
                  description="Confirm details and enter card information securely."
                >
                  <EwayPaymentStep
                    processing={isPlacingOrder}
                    onSubmit={placeOrder}
                    onSubmitActionChange={registerPaymentSubmit}
                  />
                </CheckoutPanel>
              )}

              <CheckoutNavigation
                activeStep={activeStep}
                processing={isPlacingOrder}
                disabled={cart.length === 0 || isApplyingDiscount}
                total={total}
                onBack={goToPreviousStep}
                onNext={goToNextStep}
                onPay={handlePaymentClick}
              />
            </main>

            <aside className="border-t border-neutral-100 bg-neutral-50/70 px-5 py-6 xl:border-l xl:border-t-0 lg:px-7">
              <OrderSummary
                itemCount={itemCount}
                subtotal={subtotal}
                shipping={shipping}
                gst={gst}
                total={total}
                discountCode={checkoutDetails.discountCode}
                appliedDiscount={appliedDiscount}
                discountError={discountError}
                discountLoading={isApplyingDiscount}
                onDiscountChange={(value) =>
                  updateCheckoutDetail("discountCode", value)
                }
                onApplyDiscount={applyDiscount}
                onRemoveDiscount={removeDiscount}
                orderPlaced={orderPlaced}
                activeStep={activeStep}
                checkoutDetails={checkoutDetails}
              />
            </aside>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        variant={toastVariant}
      />
    </PageContainer>
  );
}

function CheckoutPanel({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg text-neutral-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            {description}
          </p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="text-xs  uppercase tracking-wide text-neutral-500">
      {title}
    </h3>
  );
}

function EmptyCartState() {
  return (
    <div className="flex min-h-65 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-6 text-center">
      <ShoppingBag className="h-8 w-8 text-neutral-300" />
      <p className="mt-4 text-sm font-medium text-neutral-900">
        Your cart is empty.
      </p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-500">
        Browse the marketplace to add approved items before checkout.
      </p>
      <Button
        href="/dashboard/marketplace"
        variant="primary"
        className="mt-5 h-10 rounded-md bg-neutral-900 px-5 text-sm text-white"
      >
        Go to Marketplace
      </Button>
    </div>
  );
}

function ReviewBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-neutral-700">
          {title}
        </p>
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
      </div>
      <div className="divide-y divide-neutral-100 px-4">{children}</div>
    </section>
  );
}

function OrderSummary({
  itemCount,
  subtotal,
  shipping,
  gst,
  total,
  discountCode,
  appliedDiscount,
  discountError,
  discountLoading,
  onDiscountChange,
  onApplyDiscount,
  onRemoveDiscount,
  orderPlaced,
  activeStep,
  checkoutDetails,
}: {
  itemCount: number;
  subtotal: number;
  shipping: number;
  gst: number;
  total: number;
  discountCode: string;
  appliedDiscount: AppliedDiscount | null;
  discountError: string;
  discountLoading: boolean;
  onDiscountChange: (value: string) => void;
  onApplyDiscount: () => void;
  onRemoveDiscount: () => void;
  orderPlaced: boolean;
  activeStep: CheckoutStep;
  checkoutDetails: CheckoutDetails;
}) {
  return (
    <div className="xl:sticky xl:top-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base  text-neutral-950">Order summary</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {itemCount} item{itemCount === 1 ? "" : "s"} in this order
          </p>
        </div>
        <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-500 ring-1 ring-neutral-200">
          AUD
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-neutral-200 bg-white p-3">
        <div className="flex gap-2">
          <FloatingInput
            label="Discount code"
            value={discountCode}
            onChange={onDiscountChange}
            className="flex-1"
            leftAdornment={<ReceiptPercent className="h-3.5 w-3.5" />}
          />
          <Button
            variant="secondary"
            onClick={onApplyDiscount}
            disabled={discountLoading || !discountCode.trim()}
            className="h-12 rounded-md border border-neutral-200 bg-white px-4 text-sm text-neutral-700"
          >
            {discountLoading ? "Applying" : "Apply"}
          </Button>
        </div>
        {appliedDiscount && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-green-100 bg-green-50 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-green-800">
                {appliedDiscount.code} applied
              </p>
              <p className="mt-0.5 text-[11px] text-green-700/80">
                {appliedDiscount.label}
              </p>
            </div>
            <button
              type="button"
              className="text-[11px] font-medium text-green-800 hover:text-green-950"
              onClick={onRemoveDiscount}
            >
              Remove
            </button>
          </div>
        )}
        {discountError && (
          <p className="mt-2 text-[11px] leading-4 text-red-600">
            {discountError}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-2 border-t border-neutral-200 pt-5">
        <SummaryRow
          label={`Subtotal (${itemCount} item${itemCount === 1 ? "" : "s"})`}
          value={subtotal}
        />
        {appliedDiscount && (
          <SummaryRow
            label={`Discount (${appliedDiscount.code})`}
            value={-appliedDiscount.amount}
            tone="success"
          />
        )}
        <SummaryRow label="Shipping" value={shipping} />
        <SummaryRow label="GST" value={gst} />
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-neutral-200 pt-5">
        <span className="text-sm font-medium text-neutral-900">Total</span>
        <span className="text-2xl text-neutral-950">{formatAud(total)}</span>
      </div>

      {orderPlaced && (
        <div className="mt-5 rounded-lg border border-green-100 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <CheckMini className="h-5 w-5" />
            Order placed
          </div>
          <p className="mt-1 text-[11px] text-green-700/80">
            Redirecting to your summary...
          </p>
        </div>
      )}

      {activeStep === "review" && (
        <div className="mt-6 border-t border-neutral-200 pt-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm text-neutral-950">Checkout details</h3>
              <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                Review contact and delivery before payment.
              </p>
            </div>
            <span className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Review
            </span>
          </div>

          <div className="space-y-3">
            <ReviewBlock title="Contact">
              <ReviewLine label="Email" value={checkoutDetails.email} />
              <ReviewLine label="Phone" value={checkoutDetails.phone} />
            </ReviewBlock>
            <ReviewBlock title="Delivery">
              <ReviewLine
                label="Name"
                value={`${checkoutDetails.firstName} ${checkoutDetails.lastName}`}
              />
              <ReviewLine
                label="Address"
                value={formatAddress(checkoutDetails)}
              />
              {checkoutDetails.deliveryNotes && (
                <ReviewLine
                  label="Notes"
                  value={checkoutDetails.deliveryNotes}
                />
              )}
            </ReviewBlock>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckoutProgress({
  steps,
  activeStepIndex,
}: {
  steps: Array<{ id: CheckoutStep; label: string }>;
  activeStepIndex: number;
}) {
  return (
    <div className="border-b border-neutral-100 bg-neutral-50 px-5 py-4 lg:px-7">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const complete = index < activeStepIndex;
          const current = index === activeStepIndex;

          return (
            <React.Fragment key={step.id}>
              <div
                className="flex min-w-0 items-center gap-2"
                aria-current={current ? "step" : undefined}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    complete
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : current
                        ? "border-neutral-950 bg-white text-neutral-950"
                        : "border-neutral-300 bg-neutral-200 text-white"
                  }`}
                >
                  {complete ? <CheckMini className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={`truncate text-xs font-medium ${current || complete ? "text-neutral-950" : "text-neutral-500"}`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-3 h-px flex-1 ${index < activeStepIndex ? "bg-neutral-950" : "bg-neutral-200"}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function CheckoutNavigation({
  activeStep,
  processing,
  disabled,
  total,
  onBack,
  onNext,
  onPay,
}: {
  activeStep: CheckoutStep;
  processing: boolean;
  disabled: boolean;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onPay: () => void;
}) {
  if (activeStep === "review") {
    return (
      <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
          <Button
            variant="secondary"
            className="h-10 rounded-md border border-neutral-200 bg-white px-4 text-sm text-neutral-700"
            onClick={onBack}
            disabled={processing}
          >
            <span className="flex items-center gap-2">
              <ArrowLeftMini className="h-4 w-4" />
              Back
            </span>
          </Button>
          <Button
            variant="primary"
            className="h-10 rounded-md bg-neutral-900 px-5 text-sm text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onPay}
            disabled={processing || disabled}
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Processing
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LockClosedSolidMini className="h-4 w-4" />
                Pay {formatAud(total)}
              </span>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex border-t border-neutral-100 pt-4">
      <div className="ml-auto flex flex-col gap-2 sm:flex-row sm:items-center">
        {activeStep !== "cart" && (
          <Button
            variant="secondary"
            className="h-10 rounded-md border border-neutral-200 bg-white px-4 text-sm text-neutral-700"
            onClick={onBack}
            disabled={processing}
          >
            <span className="flex items-center gap-2">
              <ArrowLeftMini className="h-4 w-4" />
              Back
            </span>
          </Button>
        )}

        <Button
          variant="primary"
          className="h-10 rounded-md bg-neutral-900 px-5 text-sm text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onNext}
          disabled={processing || disabled}
        >
          <span className="flex items-center gap-2">
            {activeStep === "cart" ? "Continue to Details" : "Review Order"}
            <ArrowRightMini className="h-4 w-4" />
          </span>
        </Button>
      </div>
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 py-3 text-xs">
      <span className="text-neutral-400">{label}</span>
      <span className="min-w-0 font-medium leading-5 text-neutral-900 break-all">
        {value || "-"}
      </span>
    </div>
  );
}

function formatAddress(details: CheckoutDetails) {
  return [
    details.address,
    details.apartment,
    details.suburb,
    details.state,
    details.postcode,
  ]
    .filter(Boolean)
    .join(", ");
}

function CheckoutField({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  className = "",
  required = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  className?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <FloatingInput
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      type={type}
      className={className}
      required={required}
      error={error}
    />
  );
}

function CheckoutTextarea({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <FloatingTextarea
      label={label}
      value={value}
      onChange={onChange}
      className={className}
      rows={3}
    />
  );
}

function SummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success";
}) {
  return (
    <div className="flex items-center justify-between text-xs text-neutral-500">
      <span>{label}</span>
      <span
        className={`font-medium ${tone === "success" ? "text-green-700" : "text-neutral-900"}`}
      >
        {formatAud(value)}
      </span>
    </div>
  );
}

function EwayPaymentStep({
  processing,
  onSubmit,
  onSubmitActionChange,
}: {
  processing: boolean;
  onSubmit: (securedCardData: string) => Promise<void>;
  onSubmitActionChange: (submit: (() => void) | null) => void;
}) {
  const initializedRef = useRef(false);
  const secureFieldCodeRef = useRef("");
  const [scriptReady, setScriptReady] = useState(false);
  const [secureFieldCode, setSecureFieldCode] = useState("");
  const [publicApiKey, setPublicApiKey] = useState("");
  const [paymentConfigLoaded, setPaymentConfigLoaded] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentFieldErrors, setPaymentFieldErrors] = useState<
    Partial<Record<EwayFieldStatusKey, string>>
  >({});

  React.useEffect(() => {
    let cancelled = false;

    async function loadPaymentConfig() {
      setPaymentConfigLoaded(false);
      setPaymentError(null);

      try {
        const response = await fetch("/api/payments/eway-config", {
          cache: "no-store",
        });
        const data = (await response.json()) as { publicApiKey?: string };

        if (!cancelled) {
          setPublicApiKey(data.publicApiKey || "");
        }
      } catch {
        if (!cancelled) {
          setPublicApiKey("");
          setPaymentError("Payment configuration could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setPaymentConfigLoaded(true);
        }
      }
    }

    void loadPaymentConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (window.eWAY) {
      queueMicrotask(() => setScriptReady(true));
    }
  }, []);

  React.useEffect(() => {
    if (!scriptReady || !publicApiKey || initializedRef.current) return;
    if (!window.eWAY) return;

    initializedRef.current = true;
    const styles =
      "box-sizing: border-box; width: 100%; height: 48px; border: 0; color: #111827; font-size: 14px; line-height: 48px; padding: 0 12px; background: transparent;";

    const callback = (event: EwaySecureFieldEvent) => {
      const errorMessage = getEwayErrorMessage(event.errors);
      const statusField = toEwayFieldStatusKey(event.targetField);

      if (event.secureFieldCode) {
        secureFieldCodeRef.current = event.secureFieldCode;
        setSecureFieldCode(event.secureFieldCode);
      }

      if (errorMessage) {
        setPaymentError(errorMessage);
        if (statusField) {
          setPaymentFieldErrors((current) => ({
            ...current,
            [statusField]: errorMessage,
          }));
        }
      } else if (event.valueIsValid) {
        setPaymentError(null);
        if (statusField) {
          setPaymentFieldErrors((current) => {
            const next = { ...current };
            delete next[statusField];
            return next;
          });
        }
      } else if (statusField && event.valueIsSaved && event.valueIsValid === false) {
        const message =
          statusField === "name"
            ? "Please enter the name shown on the card."
            : statusField === "card"
              ? "Please enter a valid card number."
              : statusField === "expirytext"
                ? "Please enter a valid future expiry date in MM/YY format."
                : "Please enter a valid card security code (CVN).";
        setPaymentFieldErrors((current) => ({
          ...current,
          [statusField]: message,
        }));
      }
    };

    ewaySecureFields.forEach(({ fieldDivId, fieldType }) => {
      window.eWAY?.setupSecureField(
        {
          publicApiKey,
          fieldDivId,
          fieldType,
          styles,
          autocomplete: "true",
        },
        callback,
      );
    });
  }, [publicApiKey, scriptReady]);

  const submitPayment = React.useCallback(() => {
    if (processing) return;
    setPaymentError(null);

    if (!paymentConfigLoaded) {
      setPaymentError("Payment configuration is still loading.");
      return;
    }
    if (!publicApiKey || !scriptReady) {
      setPaymentError(
        "Payment fields could not be loaded. Please refresh and try again.",
      );
      return;
    }

    const finish = (event?: EwaySecureFieldEvent) => {
      const errorMessage = getEwayErrorMessage(event?.errors);
      if (errorMessage) {
        setPaymentError(errorMessage);
        return;
      }

      const nextCode =
        event?.secureFieldCode || secureFieldCodeRef.current || secureFieldCode;
      if (!nextCode) {
        setPaymentError("Please complete your card details before paying.");
        return;
      }

      secureFieldCodeRef.current = nextCode;
      setSecureFieldCode(nextCode);
      void onSubmit(nextCode).catch((err: unknown) => {
        setPaymentError(err instanceof Error ? err.message : "Payment failed");
      });
    };

    if (window.eWAY?.saveAllFields) {
      window.eWAY.saveAllFields(finish, 2000);
    } else {
      finish();
    }
  }, [
    onSubmit,
    paymentConfigLoaded,
    processing,
    publicApiKey,
    scriptReady,
    secureFieldCode,
  ]);

  React.useEffect(() => {
    onSubmitActionChange(submitPayment);

    return () => {
      onSubmitActionChange(null);
    };
  }, [onSubmitActionChange, submitPayment]);

  return (
    <>
      <Script
        src="https://secure.ewaypayments.com/scripts/eWAY.min.js"
        strategy="afterInteractive"
        data-init="false"
        onLoad={() => setScriptReady(true)}
      />
      <section className="overflow-hidden rounded-lg border border-neutral-900 bg-white shadow-sm">
        <div className="flex flex-col gap-4 bg-neutral-950 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/10">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm">Card details</h3>
              <p className="mt-1 text-xs text-neutral-300">
                Enter card details securely through eWAY.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {!paymentConfigLoaded && (
            <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600">
              Loading payment configuration...
            </p>
          )}

          {paymentConfigLoaded && !publicApiKey && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              eWAY public API key is not configured.
            </p>
          )}

          <SecureField
            label="Card Name"
            id="eway-secure-field-name"
            error={paymentFieldErrors.name}
          />
          <SecureField
            label="Card Number"
            id="eway-secure-field-card"
            error={paymentFieldErrors.card}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
            <SecureField
              label="Expiry (MM/YY)"
              id="eway-secure-field-expiry"
              error={paymentFieldErrors.expirytext}
            />
            <SecureField
              label="CVN"
              id="eway-secure-field-cvn"
              error={paymentFieldErrors.cvn}
            />
          </div>

          {paymentError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {paymentError}
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function SecureField({
  label,
  id,
  error,
}: {
  label: string;
  id: string;
  error?: string;
}) {
  return (
    <div>
      <div
        id={id}
        aria-label={label}
        className={`h-12 rounded-md border bg-white transition-colors focus-within:ring-1 ${
          error
            ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500"
            : "border-neutral-300 hover:border-neutral-500 focus-within:border-neutral-900 focus-within:ring-neutral-900"
        }`}
      />
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
