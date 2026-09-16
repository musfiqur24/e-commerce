import React from "react";

export type SkeletonLayout =
  | "dashboard"
  | "marketplace"
  | "treatments"
  | "prescriptions"
  | "list"
  | "table"
  | "profile"
  | "form"
  | "plan"
  | "scheduler"
  | "inline";

interface SkeletonProps {
  layout?: SkeletonLayout;
  variant?: "page" | "inline";
  className?: string;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx("animate-pulse rounded-md bg-neutral-200", className)}
    />
  );
}

function SkeletonCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-lg bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ width = "w-36" }: { width?: string }) {
  return (
    <div className="flex min-h-[43px] items-center border-b border-[#e0e0e0] px-3 py-3 lg:min-h-[51px] lg:px-6 lg:py-4">
      <SkeletonBlock className={cx("h-4", width)} />
    </div>
  );
}

function BannerSkeleton() {
  return <SkeletonBlock className="min-h-[68px] rounded-lg bg-neutral-300" />;
}

function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-lg bg-white p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.1)] md:p-6">
      <SkeletonBlock className="h-64.75 w-full shrink-0 rounded-md bg-neutral-100" />
      <div className="flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-4/5" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-3/5" />
        </div>
        <div className="mt-auto flex items-end justify-between gap-4">
          <SkeletonBlock className="h-10 w-28" />
          <SkeletonBlock className="h-5 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SkeletonBlock className="h-10" />
          <SkeletonBlock className="h-10" />
        </div>
      </div>
    </div>
  );
}

function TreatmentCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-lg bg-white p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.1)] lg:h-[534px] lg:p-4">
      <SkeletonBlock className="aspect-[461/240] w-full rounded-md bg-neutral-100" />
      <div className="flex flex-1 flex-col pt-3 lg:pt-4">
        <SkeletonBlock className="h-8 w-4/5" />
        <div className="mt-3 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-3 w-full" />
          ))}
        </div>
        <div className="mt-6 space-y-4 border-t border-[#e0e0e0] pt-4 lg:mt-auto">
          <SkeletonBlock className="h-5 w-24 rounded" />
          <SkeletonBlock className="h-6 w-20" />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ListItemSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#eee] px-3 py-3 sm:px-6">
        <div className="flex gap-8">
          <div className="space-y-2">
            <SkeletonBlock className="h-2.5 w-14 bg-neutral-300" />
            <SkeletonBlock className="h-4 w-28 bg-neutral-300" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock className="h-2.5 w-20 bg-neutral-300" />
            <SkeletonBlock className="h-4 w-24 bg-neutral-300" />
          </div>
        </div>
        <SkeletonBlock className="h-7 w-24 rounded-full bg-neutral-300" />
      </div>
      <div className="space-y-3 border-t border-neutral-200 px-3 py-4 sm:px-6">
        <SkeletonBlock className="h-5 w-2/5" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-4/5" />
      </div>
    </div>
  );
}

function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <ListItemSkeleton key={index} />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="grid grid-cols-4 gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-3.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-3" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, row) => (
        <div
          key={row}
          className={cx(
            "grid grid-cols-4 gap-4 px-6 py-4",
            row < 3 && "border-b border-neutral-100",
            row % 2 === 0 ? "bg-white" : "bg-neutral-50/60",
          )}
        >
          {Array.from({ length: 4 }).map((_, column) => (
            <SkeletonBlock key={column} className="h-3" />
          ))}
        </div>
      ))}
    </div>
  );
}

function PrescriptionsSkeleton() {
  return (
    <>
      <div className="hidden md:block">
        <TableSkeleton />
      </div>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-4 rounded-lg border border-neutral-100 bg-white p-4">
            <SkeletonBlock className="h-5 w-1/2" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-3/4" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}

function FormBodySkeleton() {
  return (
    <SkeletonCard className="overflow-hidden rounded-xl">
      <div className="flex justify-center border-b border-neutral-200">
        <SkeletonBlock className="my-4 h-6 w-64 max-w-[70%]" />
      </div>
      <div className="px-6 pb-12 sm:px-12 lg:px-24">
        <div className="grid grid-cols-5 border-x border-neutral-200">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="border-l border-neutral-200 p-3 first:border-l-0">
              <SkeletonBlock className="mx-auto h-4 w-3/4" />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-neutral-200 p-6">
          <SkeletonBlock className="mb-5 h-5 w-40" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-between border-t border-neutral-200 bg-neutral-50/50 px-6 py-5">
        <SkeletonBlock className="h-10 w-24" />
        <SkeletonBlock className="h-10 w-32" />
      </div>
    </SkeletonCard>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5">
      <BannerSkeleton />
      <FormBodySkeleton />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <BannerSkeleton />
      <div className="mt-6 space-y-6 rounded-xl border border-neutral-200 bg-white px-6 pt-4 pb-8 shadow-sm md:px-16 md:pt-6 md:pb-10 lg:px-24">
        {[6, 4, 4].map((fieldCount, section) => (
          <div key={section} className="rounded-xl bg-neutral-100 p-5">
            <SkeletonBlock className="mb-4 h-4 w-36" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: fieldCount }).map((_, index) => (
                <SkeletonBlock key={index} className="h-12 w-full bg-neutral-200" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <BannerSkeleton />
      <SkeletonCard className="overflow-hidden">
        <CardHeader width="w-28" />
        <div className="grid grid-cols-1 gap-3 px-3 pb-4 lg:grid-cols-4 lg:gap-4 lg:px-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col rounded-lg bg-white p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.1)] lg:p-4"
            >
              <SkeletonBlock className="h-[154.5px] rounded-md bg-neutral-100" />
              <div className="flex flex-1 flex-col gap-3 pt-4">
                <SkeletonBlock className="h-5 w-3/4" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-4/5" />
                <SkeletonBlock className="mt-auto h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:gap-4">
        <SkeletonCard className="min-h-63 overflow-hidden lg:col-span-2">
          <CardHeader width="w-40" />
          <div className="divide-y divide-neutral-100">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2 px-5 py-4">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-5 w-40" />
              </div>
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard className="overflow-hidden lg:col-span-3">
          <CardHeader />
          <div className="space-y-3 p-3 pb-4 lg:space-y-4 lg:px-6 lg:pt-0">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="flex min-h-30 gap-2 rounded-lg bg-white p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.1)] lg:gap-4 lg:p-4"
              >
                <SkeletonBlock className="size-20 shrink-0 rounded-md" />
                <div className="flex-1 space-y-3">
                  <SkeletonBlock className="h-5 w-2/3" />
                  <SkeletonBlock className="h-3 w-1/3" />
                  <SkeletonBlock className="h-3 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

function MarketplaceProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

function MarketplaceSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <BannerSkeleton />
      <SkeletonCard className="overflow-hidden">
        <CardHeader width="w-28" />
        <div className="space-y-4 px-3 pt-4 pb-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex gap-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-8 w-16" />
              ))}
            </div>
            <SkeletonBlock className="h-10 w-full md:w-70" />
          </div>
          <MarketplaceProductsSkeleton />
        </div>
      </SkeletonCard>
    </div>
  );
}

function TreatmentsSkeleton() {
  return (
    <div className="space-y-4">
      <BannerSkeleton />
      <SkeletonCard className="overflow-hidden pb-6 lg:pb-4">
        <CardHeader width="w-44" />
        <div className="px-3 pt-2 lg:px-6 lg:pt-4">
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 px-3 lg:grid-cols-3 lg:gap-6 lg:px-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <TreatmentCardSkeleton key={index} />
          ))}
        </div>
      </SkeletonCard>
      <SkeletonCard className="overflow-hidden pb-4">
        <CardHeader width="w-40" />
        <div className="hidden px-6 pt-4 md:block">
          <TableSkeleton />
        </div>
        <div className="px-3 pt-3 md:hidden">
          <ListSkeleton count={2} />
        </div>
      </SkeletonCard>
    </div>
  );
}

function PlanSkeleton() {
  return (
    <div className="space-y-6 pb-12">
      <BannerSkeleton />
      <SkeletonBlock className="min-h-16.5 w-full rounded-lg bg-neutral-200" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, card) => (
          <SkeletonCard key={card} className="overflow-hidden rounded-xl">
            <CardHeader width="w-36" />
            <div className="divide-y divide-neutral-200">
              {Array.from({ length: card === 0 ? 2 : 4 }).map((_, row) => (
                <div key={row} className="space-y-2 px-6 py-3">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard className="overflow-hidden rounded-xl">
        <CardHeader width="w-24" />
        <SkeletonBlock className="m-6 h-20" />
      </SkeletonCard>
      <SkeletonCard className="overflow-hidden rounded-xl">
        <CardHeader width="w-36" />
        <div className="p-6">
          <TableSkeleton />
        </div>
      </SkeletonCard>
    </div>
  );
}

function SchedulerSkeleton() {
  return (
    <div className="grid min-h-145 grid-cols-1 bg-white lg:grid-cols-12">
      <div className="space-y-5 border-neutral-200 bg-neutral-50/50 p-8 lg:col-span-4 lg:border-r">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-8 w-4/5" />
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
      <div className="p-8 lg:col-span-5">
        <div className="mb-6 flex items-center justify-between">
          <SkeletonBlock className="h-5 w-36" />
          <div className="flex gap-2">
            <SkeletonBlock className="size-8" />
            <SkeletonBlock className="size-8" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, index) => (
            <SkeletonBlock key={index} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-3 border-neutral-200 bg-neutral-50/20 p-8 lg:col-span-3 lg:border-l">
        <SkeletonBlock className="h-5 w-32" />
        {Array.from({ length: 7 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function InlineSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-4 w-1/3" />
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-4 w-4/5" />
    </div>
  );
}

function getSkeletonContent(layout: SkeletonLayout, inline: boolean) {
  switch (layout) {
    case "dashboard":
      return inline ? <InlineSkeleton /> : <DashboardSkeleton />;
    case "marketplace":
      return inline ? <MarketplaceProductsSkeleton /> : <MarketplaceSkeleton />;
    case "treatments":
      return <TreatmentsSkeleton />;
    case "prescriptions":
      return <PrescriptionsSkeleton />;
    case "list":
      return <ListSkeleton />;
    case "table":
      return <TableSkeleton />;
    case "profile":
      return inline ? <InlineSkeleton /> : <ProfileSkeleton />;
    case "form":
      return inline ? <FormBodySkeleton /> : <FormSkeleton />;
    case "plan":
      return <PlanSkeleton />;
    case "scheduler":
      return <SchedulerSkeleton />;
    case "inline":
    default:
      return <InlineSkeleton />;
  }
}

export default function Skeleton({
  layout = "dashboard",
  variant = "page",
  className = "",
}: SkeletonProps) {
  const content = getSkeletonContent(layout, variant === "inline");

  if (variant === "inline") {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={cx("min-h-screen w-full bg-[#f9f9f9]", className)}>
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-4 pb-4 lg:px-6 lg:pt-3">
        {content}
      </div>
    </div>
  );
}
