import { auth, currentUser } from "@clerk/nextjs/server";

import PageContainer from "@/components/portal/PageContainer";
import TopImageBanner from "@/components/portal/TopImageBanner";
import Card from "@/components/portal/Card";
import QuickActionsGrid from "./_components/QuickActionsGrid";

const quickActions = [
  {
    title: "Marketplace",
    description:
      "Browse our marketplace for a range of products including supplements and consumables.",
    href: "/dashboard/marketplace",
    ctaLabel: "Shop Now",
    imageSrc: "/assets/card/Card_MarketPlace.png",
  },
  {
    title: "My Orders",
    description:
      "Track and manage your orders. View order history and check delivery status.",
    href: "/dashboard/orders",
    ctaLabel: "View Orders",
    imageSrc: "/assets/card/Card_Start-Treatment.png",
  },
  {
    title: "Cart",
    description:
      "Review items in your cart and proceed to checkout when you're ready.",
    href: "/dashboard/cart",
    ctaLabel: "View Cart",
    imageSrc: "/assets/card/Card_Prescription.png",
  },
  {
    title: "Support",
    description:
      "Got a question or need a hand figuring things out? Our friendly support team is only a message away and always happy to help.",
    href: "/dashboard/support",
    ctaLabel: "Contact Support",
    imageSrc: "/assets/card/Card_Support.png",
  },
];

export default async function DashboardPage() {
  const [, user] = await Promise.all([auth(), currentUser()]);
  const firstName = user?.firstName?.trim();

  return (
    <PageContainer
      breadcrumb={[{ label: "Dashboard" }]}
    >
      <div className="space-y-4">
        {/* Banner — aligned with content */}
        <TopImageBanner
          subtitle={`Welcome back${firstName ? `, ${firstName}` : ""}`}
          title="Your full potential starts here."
        />

        {/* Content */}
        <div className="w-full">
          <Card
            title="Quick Actions"
            noPadding
            className="overflow-hidden rounded-lg border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]"
            headerClassName="min-h-0 p-3 lg:border-b-0 lg:px-6 lg:pt-4 lg:pb-1"
            titleClassName="text-[16px] leading-[1.1] font-medium text-[#1c1c1c]"
          >
            <QuickActionsGrid actions={quickActions} />
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
