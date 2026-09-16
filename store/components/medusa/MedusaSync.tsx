"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { syncUserWithMedusa } from "@/app/actions/medusa-sync";

/**
 * Invisible component — asks a server action to ensure the logged-in customer exists
 * in the Medusa customer table.
 */
export function MedusaSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const syncedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      syncedUserRef.current = null;
      return;
    }

    // Clerk browser SDK uses .emailAddress (camelCase), NOT .email_address
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      console.warn("[MedusaSync] No email found on Clerk user, retrying later");
      syncedUserRef.current = null;
      return;
    }

    const syncKey = `${user.id}:${email.toLowerCase()}`;
    if (syncedUserRef.current === syncKey) return;
    syncedUserRef.current = syncKey;

    syncUserWithMedusa()
      .then((result) => {
        if (result.success) {
          console.log("[MedusaSync] Customer synced:", email);
          router.refresh();
          return;
        }

        console.error("[MedusaSync] Server error:", result.error);
        syncedUserRef.current = null;
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[MedusaSync] Network error:", errorMessage);
        syncedUserRef.current = null; // Allow retry on next render
      });
  }, [isLoaded, isSignedIn, router, user]);

  return null;
}
