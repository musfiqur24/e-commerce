import Skeleton, { SkeletonLayout } from "./Skeleton";

interface LoadingProps {
  /** Kept for accessibility and existing callers; the visual state is skeleton-first. */
  message?: string;
  /** 'page' fills the full content area; 'inline' sits inside a container */
  variant?: "page" | "inline";
  /** Page-shaped skeleton layout to render */
  layout?: SkeletonLayout;
  /** Additional CSS classes */
  className?: string;
}

export default function Loading({
  message = "Loading",
  variant = "page",
  layout,
  className = "",
}: LoadingProps) {
  return (
    <section
      aria-busy="true"
      aria-label={message}
      className={variant === "page" ? "w-full" : "w-full"}
    >
      <Skeleton
        variant={variant}
        layout={layout ?? (variant === "inline" ? "inline" : "dashboard")}
        className={className}
      />
    </section>
  );
}
