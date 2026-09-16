import Breadcrumb, { BreadcrumbItem } from "./Breadcrumb";

interface TopbarProps {
  breadcrumb: BreadcrumbItem[];
}

export default function Topbar({ breadcrumb }: TopbarProps) {
  return (
    <header className="relative flex h-[35px] w-full shrink-0 items-start overflow-hidden border-b border-[#e0e0e0] bg-[#f9f9f9] lg:h-16 lg:items-center">
      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center px-4 pt-2 pb-3 lg:px-4 lg:py-0">
        <Breadcrumb
          items={breadcrumb}
          mutedCurrent
          className="gap-1 text-[13px] leading-[1.1] text-[#757575]"
        />
      </div>
    </header>
  );
}
