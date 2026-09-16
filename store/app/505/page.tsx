import ErrorState from "@/components/portal/ErrorState";

export default function HttpVersionErrorPreviewPage() {
  return (
    <ErrorState
      statusCode="505"
      title="Request not supported"
      description="The portal could not complete this request with the current connection. Please refresh or return to the dashboard."
      primaryActionLabel="Go to dashboard"
      primaryActionHref="/dashboard"
    />
  );
}
