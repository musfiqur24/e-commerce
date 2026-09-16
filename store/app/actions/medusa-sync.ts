"use server"

import { auth, currentUser } from "@clerk/nextjs/server";
import { upsertMedusaCustomer } from "@/lib/medusa";

export async function syncUserWithMedusa() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) return { success: false, error: "Not authenticated" };

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return { success: false, error: "No email found" };

  try {
    const customer = await upsertMedusaCustomer({
      email,
      clerkUserId: userId,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      phone: user.phoneNumbers[0]?.phoneNumber ?? undefined,
    });

    return { success: true, customerId: customer.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[MedusaSync Action] Error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
