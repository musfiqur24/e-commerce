import ErrorState from "@/components/portal/ErrorState";

export default function NotFound() {
  return (
    <ErrorState
      statusCode="404"
      title="Page not found"
      description="The page you are looking for does not exist, has moved, or is no longer available in the client portal."
      primaryActionLabel="Go to dashboard"
      primaryActionHref="/dashboard"
    />
  );
}
