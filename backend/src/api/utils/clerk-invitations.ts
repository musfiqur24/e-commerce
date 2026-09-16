/**
 * Thin wrapper around the Clerk Invitations REST API.
 *
 * Why we cache:
 * - The admin Invitations page calls `GET /admin/doctors` to populate the
 *   table. Without caching, every page load would do four Clerk requests
 *   (one per status), causing both latency and a Clerk quota burn.
 * - 60s TTL is the right tradeoff for this admin-only surface — admins won't
 *   notice a one-minute lag between accepting an invite in their email and
 *   seeing the badge change.
 */

const CLERK_API = "https://api.clerk.com/v1";

export type ClerkInviteStatus = "Pending" | "Accepted" | "Expired" | "Revoked" | "Unknown";

export interface ClerkInvitation {
  id: string;
  email_address: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  created_at: number; // unix ms
}

export interface ClerkListResult {
  items: ClerkInvitation[];
  error: string | null;
}

const SUCCESS_TTL_MS = 60_000;
const ERROR_TTL_MS = 10_000;

let cachedAt = 0;
let cachedResult: ClerkListResult | null = null;
let inflight: Promise<ClerkListResult> | null = null;

function token(): string | null {
  return process.env.CLERK_SECRET_KEY ?? null;
}

async function fetchAllByStatus(status: ClerkInvitation["status"]): Promise<ClerkInvitation[]> {
  const t = token();
  if (!t) return [];
  const items: ClerkInvitation[] = [];
  let offset = 0;
  // Hard cap to prevent runaway pagination if Clerk ever lies about totals.
  const MAX_PAGES = 20;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${CLERK_API}/invitations?status=${status}&limit=100&offset=${offset}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Clerk ${res.status}: ${body || status}`);
    }
    // The Clerk endpoint historically returned a bare array; recent versions
    // wrap in `{ data, total_count }`. Handle both.
    const json: any = await res.json().catch(() => null);
    const batch: ClerkInvitation[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    items.push(...batch);
    if (batch.length < 100) break;
    offset += batch.length;
  }
  return items;
}

async function listFresh(): Promise<ClerkListResult> {
  if (!token()) {
    return { items: [], error: "CLERK_SECRET_KEY is not configured" };
  }
  try {
    const [pending, accepted, expired, revoked] = await Promise.all([
      fetchAllByStatus("pending"),
      fetchAllByStatus("accepted"),
      fetchAllByStatus("expired"),
      fetchAllByStatus("revoked"),
    ]);
    return { items: [...pending, ...accepted, ...expired, ...revoked], error: null };
  } catch (err: any) {
    return { items: [], error: err?.message ?? String(err) };
  }
}

/**
 * Cached union of `pending`, `accepted`, `expired`, `revoked` invitations.
 * Single in-flight request is shared across concurrent callers.
 */
export async function listInvitationsCached(): Promise<ClerkListResult> {
  const now = Date.now();
  if (cachedResult && now - cachedAt < (cachedResult.error ? ERROR_TTL_MS : SUCCESS_TTL_MS)) {
    return cachedResult;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const fresh = await listFresh();
    cachedResult = fresh;
    cachedAt = Date.now();
    return fresh;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Bypass the cache. Used immediately after a mutating call (revoke / create). */
export function invalidateInvitationsCache(): void {
  cachedAt = 0;
  cachedResult = null;
}

export async function findLatestForEmail(
  email: string
): Promise<{ invitation: ClerkInvitation | null; error: string | null }> {
  const list = await listInvitationsCached();
  if (list.error) return { invitation: null, error: list.error };
  const lower = email.trim().toLowerCase();
  const matches = list.items.filter((i) => i.email_address?.toLowerCase() === lower);
  if (matches.length === 0) return { invitation: null, error: null };
  matches.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
  return { invitation: matches[0], error: null };
}

export async function revokeInvitation(id: string): Promise<{ ok: boolean; error?: string }> {
  const t = token();
  if (!t) return { ok: false, error: "CLERK_SECRET_KEY is not configured" };
  const res = await fetch(`${CLERK_API}/invitations/${id}/revoke`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}` },
  });
  invalidateInvitationsCache();
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Clerk ${res.status}: ${body}` };
  }
  return { ok: true };
}

export async function createInvitation(
  email: string,
  redirectUrl?: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const t = token();
  if (!t) return { ok: false, error: "CLERK_SECRET_KEY is not configured" };
  const res = await fetch(`${CLERK_API}/invitations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email,
      redirect_url: redirectUrl,
    }),
  });
  invalidateInvitationsCache();
  if (!res.ok) {
    const json: any = await res.json().catch(() => null);
    const message = json?.errors?.[0]?.message ?? `Clerk ${res.status}`;
    return { ok: false, error: message };
  }
  const json = (await res.json()) as ClerkInvitation;
  return { ok: true, id: json.id };
}

/**
 * Map raw Clerk status → admin UI status. Uppercases the first letter for
 * readability and treats anything else as "Unknown".
 */
export function toClerkInviteStatus(raw: ClerkInvitation["status"] | undefined): ClerkInviteStatus {
  switch (raw) {
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "expired":
      return "Expired";
    case "revoked":
      return "Revoked";
    default:
      return "Unknown";
  }
}
