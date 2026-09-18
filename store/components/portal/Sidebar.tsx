"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import Image from "next/image";
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
  EllipsisHorizontal,
} from "@medusajs/icons";

interface SidebarUser {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  imageUrl?: string | null;
}

interface SidebarProps {
  user?: SidebarUser;
  logoSrc?: string;
}

const navItems = [
  { label: "Home", href: "/dashboard", Icon: House },
  { label: "Products", href: "/dashboard/marketplace", Icon: BuildingStorefront },
  { label: "Cart", href: "/dashboard/cart", Icon: ShoppingCart },
  { label: "Orders", href: "/dashboard/orders", Icon: Shopping },
  { label: "Documents", href: "/dashboard/documents", Icon: DocumentSeries },
  { label: "Support", href: "/dashboard/support", Icon: ChatBubble },
];

interface SidebarContentProps {
  pathname: string;
  user?: SidebarUser;
  logoSrc?: string;
  onClose?: () => void;
  variant: "desktop" | "mobile";
}

function SidebarContent({
  pathname,
  user,
  logoSrc,
  onClose,
  variant,
}: SidebarContentProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { signOut } = useClerk();
  const { itemCount } = useCart();
  const isMobile = variant === "mobile";

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartCount = mounted ? itemCount : 0;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : "Client";
  const initials =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "C";

  return (
    <div className="flex h-full flex-col bg-[#f9f9f9]">
      {/* Logo */}
      <div className={`shrink-0 ${isMobile ? "p-4" : "px-3 py-6"}`}>
        <div
          className={`flex h-7 items-center rounded-md pl-1 ${
            isMobile ? "justify-between" : "pr-2"
          }`}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt="Posora"
                width={32}
                height={32}
                priority
                className="h-7 w-auto max-h-7 object-contain"
              />
            ) : null}
            <span className="text-[15px] font-semibold tracking-tight text-[#1c1c1c]">
              Posora
            </span>
          </Link>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-md text-[#757575] transition-colors hover:bg-white hover:text-[#1c1c1c] lg:hidden"
              aria-label="Close menu"
            >
              <XMark className="size-3.75" />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav
        className={`flex-1 space-y-0.5 overflow-y-auto pb-2 ${
          isMobile ? "px-4" : "px-3"
        }`}
      >
        {navItems.map(({ label, href, Icon }) => {
          const active = isActive(href);
          const isCart = href === "/dashboard/cart";
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`group flex items-center justify-between rounded-md text-[13px] leading-[1.1] font-medium transition-colors ${
                isMobile ? "p-4" : "h-7 pr-2 pl-1.5"
              } ${
                active
                  ? "bg-white text-[#1c1c1c] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]"
                  : "text-[#757575] hover:bg-white hover:text-[#1c1c1c]"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`size-3.75 shrink-0 transition-colors ${
                      active
                        ? "text-[#1c1c1c]"
                        : "text-[#757575] group-hover:text-[#1c1c1c]"
                    }`}
                  />
                  {isCart && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#c8860a] px-0.5 text-[9px] font-bold leading-none text-white shadow-sm">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </div>
              {isCart && cartCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c8860a] px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section with profile popover */}
      <div
        className={`relative shrink-0 ${isMobile ? "px-4 py-4" : "px-3 py-6"}`}
      >
        {/* Popover */}
        {profileOpen && (
          <>
            {/* Click-outside overlay */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setProfileOpen(false)}
              aria-hidden="true"
            />
            {/* Menu */}
            <div className="absolute right-0 bottom-full left-0 z-20 mx-0 mb-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              <div className="space-y-0.5 p-1">
                {/* View Profile */}
                <Link
                  href="/dashboard/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <User className="size-3.5 shrink-0 text-neutral-400" />
                  Profile
                </Link>

                <div className="my-1 border-t border-neutral-100" />

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    signOut({ redirectUrl: "/sign-in" });
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <ArrowRightOnRectangle className="size-3.5 shrink-0" />
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}

        {/* Clickable user row */}
        <button
          type="button"
          onClick={() => setProfileOpen((open) => !open)}
          className={`flex w-full items-center gap-2 rounded-md bg-white text-left transition-colors hover:bg-neutral-50 focus:outline-none ${
            isMobile ? "h-11.75 px-4 py-3" : "py-2 pr-2 pl-1"
          }`}
          aria-expanded={profileOpen}
          aria-label="Open profile menu"
        >
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full p-px shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)]">
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={displayName}
                width={18}
                height={18}
                className="size-4.5 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-4.5 items-center justify-center rounded-full bg-neutral-200 text-[9px] font-semibold text-neutral-600">
                {initials}
              </div>
            )}
          </div>
          <p className="min-w-0 flex-1 truncate text-[13px] leading-[1.1] font-medium text-[#1c1c1c]">
            {displayName}
          </p>
          <EllipsisHorizontal className="size-3.75 shrink-0 text-[#757575]" />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({
  user,
  logoSrc,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-55 flex-col border-r border-[#e0e0e0] bg-[#f9f9f9] lg:flex">
        <SidebarContent
          pathname={pathname}
          user={user}
          logoSrc={logoSrc}
          variant="desktop"
        />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-11 items-end justify-between bg-[#f9f9f9] px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="ml-auto flex size-7 items-center justify-center rounded-md text-[#1c1c1c] transition-colors hover:bg-white"
          aria-label="Open menu"
        >
          <BarsThree className="size-3.75" />
        </button>
        <Link
          href="/dashboard"
          className="absolute bottom-1 left-4 flex h-8 items-center gap-2"
        >
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt="Posora"
              width={26}
              height={26}
              className="h-6 w-auto max-h-6 object-contain"
            />
          ) : null}
          <span className="text-sm font-semibold tracking-tight text-neutral-900">
            Posora
          </span>
        </Link>
      </div>

      {/* ── Mobile overlay sidebar ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ease-out motion-reduce:transition-none lg:hidden ${
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-75 flex-col border-l border-[#e0e0e0] bg-[#f9f9f9] shadow-[-8px_0_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!mobileOpen}
      >
        <SidebarContent
          pathname={pathname}
          user={user}
          logoSrc={logoSrc}
          onClose={() => setMobileOpen(false)}
          variant="mobile"
        />
      </aside>
    </>
  );
}
