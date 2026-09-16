import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const nbInternational = localFont({
  src: "./fonts/NB-International-Pro-Regular.ttf",
  variable: "--font-nb-international",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Posora — Client Portal",
  description: "Manage your Posora journey",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo.png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

import { MedusaSync } from "@/components/medusa/MedusaSync";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${nbInternational.variable} h-full antialiased`} suppressHydrationWarning>
        <body className={`${nbInternational.className} min-h-full bg-neutral-50 text-neutral-900`} suppressHydrationWarning>
          <MedusaSync />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
