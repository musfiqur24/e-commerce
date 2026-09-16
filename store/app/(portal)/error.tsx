"use client";

import { useEffect } from "react";
import ErrorState from "@/components/portal/ErrorState";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      statusCode="500"
      title="We could not load this portal page"
      description="This page failed on the client. Retry it, or return to your dashboard and continue from there."
      onReset={reset}
      primaryActionLabel="Go to dashboard"
      primaryActionHref="/dashboard"
    />
  );
}
