"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useCart } from "@/context/CartContext";
import {
  BuildingStorefront,
  ShoppingCart,
  ChatBubble,
  BarsThree,
  XMark,
  SquaresPlus,
  House,
  Shopping,
  DocumentSeries,
  User,
  ArrowRightOnRectangle,
} from "@medusajs/icons";

interface NavbarUser {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  imageUrl?: string | null;
}

interface NavbarProps {
  user?: NavbarUser;
  logoSrc?: string;
}

const navItems = [
  { label: "Home",        href: "/dashboard",             Icon: House },
  { label: "Products",    href: "/dashboard/marketplace", Icon: BuildingStorefront },
  { label: "Cart",        href: "/dashboard/cart",        Icon: ShoppingCart },
  { label: "Orders",      href: "/dashboard/orders",      Icon: Shopping },
  { label: "Documents",   href: "/dashboard/documents",   Icon: DocumentSeries },
  { label: "Support",     href: "/dashboard/support",     Icon: ChatBubble },
];

export default function Navbar({ user, logoSrc }: NavbarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { itemCount } = useCart();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartCount = mounted ? itemCount : 0;

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : "Account";

  const initials =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "A";

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Main navbar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e5e0d8] bg-[#faf8f5] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-16 max-w-350 items-center justify-between px-4 lg:px-8">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
            {logoSrc && (
              <Image
                src={logoSrc}
                alt="Posora"
                width={40}
                height={40}
                priority
                className="h-9 w-auto object-contain"
              />
            )}
            <span className="text-2xl font-bold tracking-tight text-[#1a1a1a]">
              Posora
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(({ label, href, Icon }) => {
              const active = isActive(href);
              const isCart = href === "/dashboard/cart";
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors rounded-md ${
                    active
                      ? "text-[#1a1a1a]"
                      : "text-[#6b6b6b] hover:text-[#1a1a1a]"
                  }`}
                >
                  <div className="relative inline-flex items-center justify-center">
                    <Icon
                      className={`size-4 shrink-0 transition-colors ${
                        active ? "text-[#c8860a]" : "text-[#9b9b9b] group-hover:text-[#c8860a]"
                      }`}
                    />
                    {isCart && cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#c8860a] px-1 text-[9px] font-bold leading-none text-white shadow-sm ring-2 ring-[#faf8f5]">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </div>
                  <span className={isCart && cartCount > 0 ? "ml-1" : ""}>{label}</span>
                  {/* Active amber underline */}
                  <span
                    className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#c8860a] transition-all duration-200 ${
                      active ? "opacity-100" : "opacity-0 group-hover:opacity-30"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Right side: user + mobile toggle */}
          <div className="flex items-center gap-2">
            {/* Desktop user */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#1a1a1a] transition-colors hover:bg-[#ede9e3] focus:outline-none"
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8e2d9] shadow-[0_0_0_2px_#c8860a33]">
                  {user?.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={displayName}
                      width={32}
                      height={32}
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[13px] font-semibold text-[#c8860a]">
                      {initials}
                    </span>
                  )}
                </div>
                <span className="max-w-30 truncate">{displayName}</span>
                <svg className="size-3.5 text-[#6b6b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-[#e5e0d8] bg-white shadow-lg">
                    <div className="p-1.5 space-y-0.5">
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#3a3a3a] transition-colors hover:bg-[#faf8f5] hover:text-[#1a1a1a]"
                      >
                        <User className="size-4 shrink-0 text-[#6b6b6b]" />
                        Profile
                      </Link>
                      <div className="my-1 border-t border-[#e5e0d8]" />
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          signOut({ redirectUrl: "/sign-in" });
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <ArrowRightOnRectangle className="size-4 shrink-0" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg text-[#1a1a1a] transition-colors hover:bg-[#ede9e3] lg:hidden"
              aria-label="Open menu"
            >
              <BarsThree className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer overlay ─────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile drawer ────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-75 flex-col bg-[#faf8f5] shadow-[-8px_0_32px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!mobileOpen}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-[#e5e0d8] px-5 py-4">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
            {logoSrc && (
              <Image src={logoSrc} alt="Posora" width={32} height={32} className="h-7 w-auto object-contain" />
            )}
            <span className="text-xl font-bold tracking-tight text-[#1a1a1a]">Posora</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex size-8 items-center justify-center rounded-lg text-[#6b6b6b] hover:bg-[#ede9e3] hover:text-[#1a1a1a]"
          >
            <XMark className="size-4" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ label, href, Icon }) => {
            const active = isActive(href);
            const isCart = href === "/dashboard/cart";
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${
                  active
                    ? "bg-[#1a1a1a] text-white"
                    : "text-[#3a3a3a] hover:bg-[#ede9e3] hover:text-[#1a1a1a]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <Icon className={`size-4 shrink-0 ${active ? "text-[#c8860a]" : "text-[#6b6b6b]"}`} />
                    {isCart && cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#c8860a] px-0.5 text-[9px] font-bold leading-none text-white shadow-sm">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </div>
                  <span>{label}</span>
                </div>
                {isCart && cartCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c8860a] px-2 text-[11px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Drawer user */}
        <div className="border-t border-[#e5e0d8] p-4 space-y-2">
          <Link
            href="/dashboard/profile"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium text-[#3a3a3a] hover:bg-[#ede9e3]"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8e2d9]">
              {user?.imageUrl ? (
                <Image src={user.imageUrl} alt={displayName} width={32} height={32} className="size-8 rounded-full object-cover" />
              ) : (
                <span className="text-[13px] font-semibold text-[#c8860a]">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#1a1a1a]">{displayName}</p>
              {user?.email && <p className="truncate text-[11px] text-[#6b6b6b]">{user.email}</p>}
            </div>
          </Link>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium text-red-500 hover:bg-red-50"
          >
            <ArrowRightOnRectangle className="size-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
