import { currentUser } from "@clerk/nextjs/server";
import Navbar from "@/components/portal/Navbar";
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
      <div className="min-h-screen flex flex-col bg-[#faf8f5]">
        <Navbar
          user={userProps}
          logoSrc="/Logo.png"
        />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </Providers>
  );
}
