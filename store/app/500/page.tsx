import ErrorState from "@/components/portal/ErrorState";

export default function ServerErrorPreviewPage() {
  return (
    <ErrorState
      statusCode="500"
      title="Something went wrong"
      description="This is the portal error screen for unexpected failures. Framework errors use the same client-side design."
      primaryActionLabel="Go to dashboard"
      primaryActionHref="/dashboard"
    />
  );
}
