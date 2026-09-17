# Inventory and Stripe setup

## Inventory design

Medusa is the source of truth. Each option combination is a product variant, with its own price and inventory item. Stock is stored per warehouse. Options are arbitrary: Size, Color, Material, Pack Size, or any names you configure.

Available quantity = stocked quantity minus reserved quantity. Placing an order reserves its quantities immediately, reducing what other customers can buy. Fulfillment reduces physical stocked quantity and releases the reservation; it does not deduct availability twice. Cancelling an unfulfilled order through Medusa releases reservations. Refunds do not necessarily mean physical goods have returned: process returns/restocking in Admin.

The catalog remains in Products; a purchase creates an order with copies of its purchased line items. Sold-out products remain visible and cannot be added to the cart. Cards warn at **five or fewer** available pieces, using the actual count. Variant selection shows availability for that exact combination. Catalog availability refreshes every 30 seconds and on window focus; checkout checks authoritative stock again.

Cart completion uses Medusa's native cart/inventory locks and compensation. PostgreSQL locking is configured so separate backend processes share locks. Browser and webhook completion both use the same Medusa cart, preventing duplicate orders/reservations. Stripe only authorizes initially; the application captures after the order and reservation exist. Capture is retried by an order subscriber and a two-minute reconciliation job. Failed capture remains visible as unpaid/processing in Admin and must not be fulfilled. Investigate repeated capture errors; cancel an unrecoverable order to release stock.

## Configure inventory

Use the standard Products and Inventory screens. The custom Add stocked product and Inventory Lots features have been removed. Product creation no longer includes Medication Form/Strength; the optional Product PDF remains available.

1. In Medusa Admin, configure your stock location under Settings → Locations & Shipping (for example, Bangladesh Warehouse).
2. Link that warehouse to the sales channel used by your portal. Link the portal's publishable API key to the **same** sales channel. Prefer one warehouse per portal sales channel initially; Medusa's allocation rules decide which warehouse supplies an order.
3. Configure a BDT region including Bangladesh, a shipping profile, fulfillment provider, service zone, and delivery options/prices. Checkout now uses these actual shipping options; the old standalone Shipping product is excluded from the catalog and no longer determines checkout delivery charges.
4. Use the standard **Inventory** screen. Create an inventory item for each sellable size/color combination, with a descriptive title and unique SKU (for example `T-Shirt / M / Blue`, `TSHIRT-M-BLUE`). In its **Availability** step, select the warehouse and enter the actual stocked quantity, for example `20`.
5. Open the standard **Products > Create** wizard. Enter product details and configure options such as `Size: S, M, L` and `Color: Red, Blue`.
6. In **Organize**, select the shipping profile and **Default Sales Channel**, linked to the warehouse above.
7. In **Variants**, enter each price in taka, enable **Managed inventory**, leave **Allow backorder** off, and enable **Has inventory kit** to select existing inventory items in the next step.
8. In the **Inventory** step, link each variant to its matching inventory item. Set the quantity to `1` for a single piece per sale. This is **required quantity per sold variant**, not stock on hand. A pack containing two pieces would use `2`.
9. Publish the product. For example, an item stocked at `20` with required quantity `1` supports 20 sales; an order for 3 reserves 3 and leaves 17 available.
10. Update stock through **Inventory > item > location** using the standard stock quantity controls. If you create products without selecting existing inventory items, Medusa creates inventory items for managed variants; add their warehouse stock afterward. New items have no sellable stock until configured.

The initial demo-data seed has been removed. Migrations and restarts no longer create sample products, stock, regions, stores, or API keys. Configure real products and quantities through Admin; currency reference data and the configured store currency are preserved.

Old browser carts without variant IDs are not migrated because their intended size/color cannot be inferred; shoppers add those products again.

### Product wizard maintenance

The dashboard uses Zod 4. Backend package overrides pin a compatible form resolver and React Hook Form version so invalid option/variant data produces visible field errors instead of a rejected validation promise. The dashboard patch updates both source and distributed modules; rebuild and restart the backend after changing it.

## Sandbox testing first

Use a Stripe sandbox for this project's initial setup. Stripe lets you test after creating an account without activating live payments, and sandbox transactions do not move real money. The live-country eligibility discussion below applies to accepting real payments, not to the test integration. See https://docs.stripe.com/get-started/account and https://docs.stripe.com/sandboxes.

For the running Docker setup, place the sandbox settings in `F:/Project_Musfiq/e-commerce/.env` (beside docker-compose.yml):

```dotenv
STRIPE_API_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORTAL_REGION_ID=reg_...
PORTAL_SALES_CHANNEL_ID=sc_...
```

Use keys from the same sandbox. Install Stripe CLI, run `stripe login` and select/authorize that sandbox, then run `stripe listen --forward-to http://localhost:9000/hooks/payment/stripe_stripe`. Use the listener's signing secret above and keep the listener running. You do not need a public webhook endpoint for this local CLI setup. Run `docker compose up -d backend store` to load the environment, enable Stripe in the BDT region, and test through the portal with the test card below. Do not use `--live`.

## Live Stripe account eligibility

First check https://stripe.com/global against the country where your business is legally established. As checked on September 17, 2026, Bangladesh is not listed for direct Stripe Payments accounts. A BDT storefront does not make a Bangladesh business eligible. Use an eligible business with the required registration, identity and banking details in a supported country; do not select a false country. If your business is Bangladesh-only, live Stripe activation is an external blocker and you will need an available payment provider or a legitimately eligible business structure.

## Stripe setup, step by step

1. Create your Stripe account at https://dashboard.stripe.com/register and confirm your email. Live activation is not required for sandbox testing.
2. In the Dashboard account picker, choose Sandboxes (or Switch to sandbox), then create/open a sandbox named `E-commerce Development`. Inside that sandbox's Developers/Workbench → API keys, copy the **publishable** key (`pk_test_...`) and **secret** key (`sk_test_...`). Never commit keys or paste the secret into browser code.
3. Add the following to `backend/.env` (replace placeholders):

   ```dotenv
   STRIPE_API_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   PORTAL_REGION_ID=reg_...
   PORTAL_SALES_CHANNEL_ID=sc_...
   ```

   Obtain the region/channel IDs from their Admin page URLs or the Admin API. The configured region must use BDT and contain Bangladesh. The backend must retain its existing DATABASE_URL and authentication settings.

4. Add this to `store/.env.local`:

   ```dotenv
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

   Keep the existing `MEDUSA_API_KEY`, Clerk settings, backend URL, and Medusa publishable key. Stripe's secret and webhook keys belong only on the backend. The public Stripe key is served at runtime, so it does not require a frontend build argument.

5. Configure the webhook/listener in the next steps, then restart both applications. In Medusa Admin → Settings → Regions → your BDT region, enable **Stripe** (`pp_stripe_stripe`). The provider is registered only when both STRIPE_API_KEY and STRIPE_WEBHOOK_SECRET are present. Configure delivery options and inventory as above before trying checkout.
6. Configure a Stripe webhook endpoint pointing at:

   ```text
   https://YOUR-BACKEND-DOMAIN/hooks/payment/stripe_stripe
   ```

   Subscribe to `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, and `payment_intent.partially_funded`. Copy this endpoint's signing secret into STRIPE_WEBHOOK_SECRET, then restart the backend. Medusa verifies the signature and processes completion independently of the browser.

7. For local testing, install Stripe CLI, run `stripe login`, then:

   ```sh
   stripe listen --forward-to localhost:9000/hooks/payment/stripe_stripe
   ```

   Put the listener's `whsec_...` secret in backend/.env and restart. The CLI signing secret differs from a deployed webhook endpoint's secret. Keep the listener running.
8. Create a product with two variants, each with a small stock count. Sign in to the portal with a verified email, select a variant, add it to cart, enter a Bangladesh delivery address, review the shipping option, and pay.
9. In **test mode only**, use `4242 4242 4242 4242`, any future expiration date and a three-digit CVC. Stripe also documents failure and 3DS cards at https://docs.stripe.com/testing. Never test against live keys.
10. Confirm all three outcomes: an order appears in Medusa and the customer's Orders page; payment is captured in Stripe; the purchased variant's available stock decreases by the purchased quantity. Reload the confirmation page and resend the same webhook: neither should duplicate the order or deduction.
11. Test ordering more than available stock, two customers competing for the last unit, a declined payment, a 3DS payment, and closing the browser immediately after authorization. Check cancellation releases reservations. Fulfill a paid order and verify available stock is not deducted again.
12. For production, replace both test API keys with live keys from the same account, register the production HTTPS webhook and its signing secret, verify your account/currency eligibility, and repeat a controlled real purchase/refund. Do not fulfill orders whose payments are still processing or unpaid.

Docker Compose reads the five new settings from the root Compose `.env` or shell environment and forwards them to the appropriate containers. For another deployment system, set them in its runtime secret/environment manager. Removed legacy payment credentials are no longer used.

Set `REDIS_URL` on production backends for durable Redis event delivery (already wired in Docker Compose). Local development can use the local event bus. PostgreSQL provides cross-process inventory locks in either case. Ensure the backend worker runs subscribers and scheduled jobs.

The Docker backend runs with `NODE_ENV=production` to serve compiled Admin assets. Running the production image in development mode creates temporary Vite `/@fs/` imports that can disappear on recreation. `LOCAL_HTTP_COOKIES=true` is only for this localhost Compose setup; omit it on HTTPS deployments. Uploaded files persist through the `backend/static` bind mount.

## Verification commands

```sh
cd store
npx next typegen
npx tsc --noEmit
cd ../backend
npx tsc --noEmit
```

These type checks do not replace the Stripe sandbox and database acceptance checks above.

References: https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider/stripe and https://docs.medusajs.com/resources/commerce-modules/inventory/reservations-lifecycle
