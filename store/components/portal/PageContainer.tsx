import Topbar from "./Topbar";
import { BreadcrumbItem } from "./Breadcrumb";

interface PageContainerProps {
  children: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
  className?: string;
  contentClassName?: string;
}

export default function PageContainer({
  children,
  breadcrumb,
  className = "",
  contentClassName = "",
}: PageContainerProps) {
  return (
    <div className={`flex min-h-[calc(100vh-4rem)] flex-col bg-[#faf8f5] ${className}`}>
      <div
        className={`mx-auto w-full max-w-350 flex-1 ${contentClassName || "px-4 pt-4 pb-10 lg:px-8"}`}
      >
        {children}
      </div>
    </div>
  );
}
