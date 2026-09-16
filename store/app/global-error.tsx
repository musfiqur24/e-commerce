"use client";

import { useEffect } from "react";
import ErrorState from "@/components/portal/ErrorState";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <ErrorState
          statusCode="500"
          title="Portal unavailable"
          description="A top-level client error stopped the portal from rendering. Retry the page, or head back to the dashboard once the app recovers."
          onReset={reset}
          primaryActionLabel="Go to dashboard"
          primaryActionHref="/dashboard"
        />
      </body>
    </html>
  );
}
