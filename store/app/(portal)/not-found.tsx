import ErrorState from "@/components/portal/ErrorState";

export default function PortalNotFound() {
  return (
    <ErrorState
      statusCode="404"
      title="Portal page not found"
      description="That portal page is not available. It may have moved, or the link may be incomplete."
      primaryActionLabel="Go to dashboard"
      primaryActionHref="/dashboard"
    />
  );
}
