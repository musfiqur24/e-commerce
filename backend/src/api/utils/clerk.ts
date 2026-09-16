const CLERK_API_BASE = "https://api.clerk.com/v1";

function getClerkSecretKey(): string | null {
  return process.env.CLERK_SECRET_KEY || null;
}

export interface ClerkUserName {
  firstName: string | null;
  lastName: string | null;
}

/** Reads a Clerk user's current name via Clerk's REST API. */
export async function getClerkUserName(
  clerkUserId: string,
): Promise<ClerkUserName | null> {
  const secretKey = getClerkSecretKey();
  if (!secretKey) {
    console.error("[Clerk] CLERK_SECRET_KEY is not configured");
    return null;
  }

  const response = await fetch(
    `${CLERK_API_BASE}/users/${encodeURIComponent(clerkUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    console.error(
      `[Clerk] Failed to fetch user ${clerkUserId}: ${response.status}`,
    );
    return null;
  }

  const data = await response.json();
  return {
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
  };
}

/** Overwrites a Clerk user's name via Clerk's REST API. Returns whether it succeeded. */
export async function updateClerkUserName(
  clerkUserId: string,
  firstName: string,
  lastName: string,
): Promise<boolean> {
  const secretKey = getClerkSecretKey();
  if (!secretKey) {
    console.error("[Clerk] CLERK_SECRET_KEY is not configured");
    return false;
  }

  const response = await fetch(
    `${CLERK_API_BASE}/users/${encodeURIComponent(clerkUserId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    console.error(
      `[Clerk] Failed to update user ${clerkUserId}: ${response.status} ${err}`,
    );
    return false;
  }

  return true;
}
