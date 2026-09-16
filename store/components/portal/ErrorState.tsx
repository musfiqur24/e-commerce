"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightMini, ExclamationCircleSolid } from "@medusajs/icons";

interface ErrorStateProps {
  statusCode?: string;
  title: string;
  description: string;
  primaryActionLabel?: string;
  primaryActionHref?: string;
  secondaryActionLabel?: string;
  onReset?: () => void;
}

export default function ErrorState({
  statusCode = "500",
  title,
  description,
  primaryActionLabel = "Back to dashboard",
  primaryActionHref = "/dashboard",
  secondaryActionLabel = "Try again",
  onReset,
}: ErrorStateProps) {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex items-center justify-between gap-6 border-b border-neutral-100 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600">
                <ExclamationCircleSolid className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  Error {statusCode}
                </p>
                <h1 className="mt-1 text-2xl font-bold leading-tight text-neutral-900">
                  {title}
                </h1>
              </div>
            </div>
            <span className="hidden text-5xl font-bold text-neutral-100 sm:block">
              {statusCode}
            </span>
          </div>

          <p className="max-w-2xl text-sm font-medium leading-6 text-neutral-500">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-neutral-900 px-4 text-xs font-bold text-white transition-colors hover:bg-black"
              >
                {secondaryActionLabel}
              </button>
            )}
            <Link
              href={primaryActionHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-xs font-bold text-neutral-900 transition-colors hover:bg-neutral-50"
            >
              {primaryActionLabel}
              <ArrowRightMini className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
