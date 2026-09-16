# Posora Client Portal

Next.js patient portal for Clerk auth, Medusa customer/cart data, and HubSpot patient records.

## Getting Started

Run the frontend and backend in separate terminals:

```bash
cd client-portal
npm run dev
```

```bash
cd backend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Medusa backend should be available at [http://localhost:9000](http://localhost:9000).

## Signup And HubSpot Sync

HubSpot is the source of truth for patient identity. Signup sync is intentionally idempotent and has two paths:

```text
Primary:
Clerk user.created webhook -> Next API -> HubSpot upsert -> Medusa customer metadata

Fallback/repair:
Dashboard load -> MedusaSync -> backend /store/sync-user -> HubSpot upsert -> Medusa customer metadata
```

The key success condition is:

```text
Medusa customer metadata contains hubspot_id
```

If `hubspot_id` exists, HubSpot already returned a real contact id. The HubSpot UI/search may still take a short time to show the contact because HubSpot indexing can lag behind the API response.

### Primary Webhook

The Clerk webhook route is:

```text
client-portal/app/api/webhooks/clerk/route.ts
```

For `user.created` and `user.updated`, it:

- verifies the Svix signature using `CLERK_WEBHOOK_SECRET`
- upserts the HubSpot contact with `email`, `clerk_user_id`, `firstname`, `lastname`, and `phone`
- writes the returned HubSpot contact id into Medusa as `metadata.hubspot_id`
- returns `500` if HubSpot or Medusa sync fails, so Clerk can retry

Required frontend/runtime env:

```bash
CLERK_WEBHOOK_SECRET=...
HUBSPOT_ACCESS_TOKEN=...
MEDUSA_API_KEY=...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=...
```

In production these must be present in:

```text
/opt/patient-portal/.env.frontend
```

### Fallback Repair Sync

The browser component is:

```text
client-portal/components/medusa/MedusaSync.tsx
```

It runs after the user is signed in and calls:

```text
POST /store/sync-user
```

The backend route is:

```text
backend/src/api/store/sync-user/route.ts
```

This route treats HubSpot as a hard dependency:

- no `HUBSPOT_ACCESS_TOKEN` -> `500`
- HubSpot upsert failure -> `502`
- HubSpot returns no contact id -> `502`
- Medusa is only created/updated after HubSpot returns a concrete contact id

Required backend/runtime env:

```bash
HUBSPOT_ACCESS_TOKEN=...
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=...
```

In production these must be present in:

```text
/opt/patient-portal/.env.backend
```

### Local Debugging

Frontend webhook and server action logs appear in the `client-portal` terminal:

```text
[Webhook] user.created -> HubSpot contact ...
[Webhook] user.created - HubSpot failed:
[Webhook] user.created - Medusa failed:
```

Browser repair sync logs appear in the browser DevTools console:

```text
[MedusaSync] Patient synced (...) hubspot_id: ...
[MedusaSync] Server error:
[MedusaSync] Network error:
```

Backend repair sync logs appear in the `backend` terminal:

```text
[sync-user] HubSpot upsert HTTP error:
[sync-user] HubSpot upsert failed:
[sync-user] HubSpot upsert returned no contact id for:
```

### Verify A Signup By Email

From a shell with `MEDUSA_API_KEY` set, check whether Medusa has the HubSpot id:

```bash
curl -s -u "$MEDUSA_API_KEY:" \
  "http://localhost:9000/admin/customers?email=test@example.com&limit=1"
```

Look for:

```json
"metadata": {
  "clerk_user_id": "user_...",
  "hubspot_id": "..."
}
```

If `hubspot_id` exists, HubSpot contact creation succeeded at the API level. If the HubSpot UI does not show it immediately, wait briefly and search again, or open the contact directly by id.

## eWAY Cart Payments

Medicine cart checkout uses eWAY Secure Fields in the browser and the Rapid Direct Connection API on the server. Configure these variables in `.env.local`:

```bash
NEXT_PUBLIC_EWAY_PUBLIC_API_KEY=epk-...
EWAY_API_KEY=...
EWAY_API_PASSWORD=...
EWAY_ENVIRONMENT=sandbox
EWAY_CURRENCY=AUD
```

Use `EWAY_ENVIRONMENT=production` only with live credentials.

In production, set these eWAY values in `/opt/patient-portal/.env.frontend`. The app reads the public eWAY key through `/api/payments/eway-config` at runtime, so changing it on the VM only requires recreating the frontend container after this code has been deployed.

## Production Environment on GCP

Production runtime environment variables are managed on the GCP VM, not written from the GitHub Actions deploy job. The deploy workflow writes the Docker Compose file to `/opt/patient-portal/docker-compose.yml` and expects these persistent env files to already exist on the VM:

```bash
/opt/patient-portal/.env
/opt/patient-portal/.env.backend
/opt/patient-portal/.env.frontend
```

The backend container loads `.env.backend`, and the frontend container loads `.env.frontend`.

GitHub Actions secrets should be limited to deployment credentials and values needed while building the frontend image:

```bash
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_SERVICE_ACCOUNT
VPS_HOST
VPS_USER
VPS_SSH_KEY
VPS_PORT
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_MEDUSA_BACKEND_URL
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
```

Application runtime secrets should live in the VM env files instead. This includes HubSpot, Clerk server secrets, database, CORS, JWT/cookie, Medusa admin, Google, SMTP, and eWAY private credentials.

To check the env files on the VM:

```bash
gcloud compute ssh VM_NAME --zone ZONE --project get-protocol-496912
cd /opt/patient-portal
ls -la .env .env.backend .env.frontend
sed -n 's/=.*$/=<hidden>/p' .env .env.backend .env.frontend
```

Use `cat .env.backend` or `cat .env.frontend` only when you intentionally need to view secret values.

Some public Next.js values are still passed at image build time from GitHub Actions secrets because `NEXT_PUBLIC_*` values are bundled into the frontend build:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_MEDUSA_BACKEND_URL
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
```
