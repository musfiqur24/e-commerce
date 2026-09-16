"use client";

import { useEffect } from "react";
import ErrorState from "@/components/portal/ErrorState";

export default function AppError({
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
      title="Something went wrong"
      description="The portal hit an unexpected client-side error while loading this page. You can retry the page or return to your dashboard."
      onReset={reset}
      primaryActionLabel="Go to dashboard"
      primaryActionHref="/dashboard"
    />
  );
}
