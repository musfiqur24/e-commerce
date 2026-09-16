'use client'

import React from "react";
import ImageCard from "@/components/portal/ImageCard";
import Button from "@/components/portal/Button";
import { useRouter } from "next/navigation";

interface QuickAction {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  imageSrc: string;
}

interface QuickActionsGridProps {
  actions: QuickAction[];
}

export default function QuickActionsGrid({ actions }: QuickActionsGridProps) {
  const router = useRouter();

  const handleActionClick = (action: QuickAction) => {
    router.push(action.href);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <ImageCard
          key={action.href}
          src={action.imageSrc}
          alt={action.title}
          height="h-[148px]"
          padding="p-0"
          imageContainerClassName="rounded-xl overflow-hidden"
          className="group cursor-pointer rounded-2xl border border-[#e5e0d8] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
          onClick={() => handleActionClick(action)}
        >
          <div className="flex flex-1 flex-col gap-3 pt-4">
            <div className="flex-1">
              <h3 className="text-[17px] font-bold tracking-tight text-[#1a1a1a]">
                {action.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-[#6b6b6b]">
                {action.description}
              </p>
            </div>
            <div className="mt-auto">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick(action);
                }}
                className="h-10 w-full rounded-xl border-none bg-[#1a1a1a] px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#c8860a] active:scale-[0.98]"
              >
                {action.ctaLabel}
              </Button>
            </div>
          </div>
        </ImageCard>
      ))}
    </div>
  );
}
