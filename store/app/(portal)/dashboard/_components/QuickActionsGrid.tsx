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
    <div className="grid grid-cols-1 gap-3 px-3 pb-4 lg:grid-cols-4 lg:gap-4 lg:px-6">
      {actions.map((action) => (
        <ImageCard
          key={action.href}
          src={action.imageSrc}
          alt={action.title}
          height="h-[154.5px]"
          padding="p-0"
          imageContainerClassName="rounded-[6px]"
          className="group cursor-pointer rounded-lg border-0 p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.1)] transition-shadow hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_10px_rgba(0,0,0,0.14)] lg:p-4"
          onClick={() => handleActionClick(action)}
        >
          <div className="flex flex-1 flex-col gap-4 pt-4">
            <div className="flex-1">
              <h3 className="text-[18px] leading-[1.25] font-medium tracking-[-0.17px] text-[#1c1c1c]">
                {action.title}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.6] font-medium text-[#757575]">
                {action.description}
              </p>
            </div>
            <div className="mt-auto">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick(action);
                }}
                className="h-10 w-full rounded-[6px] border-none bg-[#2e2f2f] px-5 py-2 text-[14px] leading-[1.1] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),0_0_0_1px_#18181b,inset_0_0.75px_0_rgba(255,255,255,0.2)] hover:bg-[#18181b]"
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
