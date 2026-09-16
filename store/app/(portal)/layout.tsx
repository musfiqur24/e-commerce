import { currentUser } from "@clerk/nextjs/server";
import Sidebar from "@/components/portal/Sidebar";
import Providers from "@/providers";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  const userProps = {
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    email: userEmail,
    imageUrl: user?.imageUrl ?? null,
  };

  return (
    <Providers>
      <div className="min-h-screen flex bg-neutral-50">
        <Sidebar
          user={userProps}
          logoSrc="/logo.png"
        />
        <main className="flex-1 lg:pl-55 min-h-screen">
          <div className="h-11 bg-[#f9f9f9] lg:hidden" />
          {children}
        </main>
      </div>
    </Providers>
  );
}
