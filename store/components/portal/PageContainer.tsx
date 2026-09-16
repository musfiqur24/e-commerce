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
    <div className={`flex min-h-screen flex-col bg-[#f9f9f9] ${className}`}>
      {breadcrumb && <Topbar breadcrumb={breadcrumb} />}
      <div
        className={`mx-auto w-full max-w-[1200px] flex-1 ${contentClassName || "px-6 pt-3 pb-4"}`}
      >
        {children}
      </div>
    </div>
  );
}
