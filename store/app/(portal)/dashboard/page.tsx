import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";

const categories = [
  { label: "Merch",       emoji: "👕", href: "/dashboard/marketplace?category=merch" },
  { label: "Pants",       emoji: "👖", href: "/dashboard/marketplace?category=pants" },
  { label: "Shirts",      emoji: "👔", href: "/dashboard/marketplace?category=shirts" },
  { label: "Sweatshirts", emoji: "🧥", href: "/dashboard/marketplace?category=sweatshirts" },
  { label: "Accessories", emoji: "👜", href: "/dashboard/marketplace?category=accessories" },
  { label: "Deals",       emoji: "🏷️", href: "/dashboard/marketplace?category=deals" },
];

const features = [
  { icon: "🚚", title: "Free Shipping",   desc: "On orders over $99" },
  { icon: "↩️", title: "7-Day Returns",   desc: "Easy returns & refunds" },
  { icon: "🔒", title: "Secure Payments", desc: "100% secure checkout" },
];

export default async function DashboardPage() {
  const [, user] = await Promise.all([auth(), currentUser()]);
  const firstName = user?.firstName?.trim();

  return (
    <div className="min-h-screen bg-[#faf8f5]">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#f0ece5]">
        <div className="mx-auto flex max-w-350 flex-col-reverse items-center gap-0 px-6 lg:flex-row lg:px-8">

          {/* Text side */}
          <div className="flex-1 py-10 lg:py-16">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.15em] text-[#c8860a]">
              {firstName ? `Welcome back, ${firstName}` : "New Collection"}
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-[#1a1a1a] lg:text-5xl">
              Elevate Your Style,{" "}
              <span className="text-[#c8860a]">Every Day.</span>
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#6b6b6b]">
              Discover premium quality products curated for your lifestyle.
              Shop the latest trends now.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/marketplace"
                className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-7 py-3 text-[14px] font-normal text-white shadow-md transition-all hover:bg-[#c8860a] active:scale-[0.98]"
              >
                Shop Now →
              </Link>
              <Link
                href="/dashboard/marketplace"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#1a1a1a] px-7 py-3 text-[14px] font-normal text-[#1a1a1a] transition-all hover:border-[#c8860a] hover:text-[#c8860a]"
              >
                Explore Collection
              </Link>
            </div>

            {/* Mini features */}
            <div className="mt-8 flex flex-wrap gap-5">
              {features.map((f) => (
                <div key={f.title} className="flex items-center gap-2">
                  <span className="text-lg">{f.icon}</span>
                  <div>
                    <p className="text-[11px] font-bold text-[#1a1a1a]">{f.title}</p>
                    <p className="text-[10px] text-[#6b6b6b]">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image side — homepage.webp */}
          <div className="relative w-full py-4 lg:w-140 lg:shrink-0 lg:py-6">
            <div className="relative h-65 w-full overflow-hidden rounded-2xl shadow-sm sm:h-85 lg:h-100">
              <Image
                src="/assets/homepage.webp"
                alt="Posora Collection"
                fill
                priority
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 560px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Category Circles ──────────────────────────────────────────── */}
      <section className="border-b border-[#e5e0d8] bg-white py-8">
        <div className="mx-auto max-w-350 px-6 lg:px-8">
          <div className="flex gap-6 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible">
            {categories.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="group flex shrink-0 flex-col items-center gap-2.5"
              >
                <div className="flex size-16 items-center justify-center rounded-full border-2 border-[#e5e0d8] bg-[#faf8f5] text-2xl shadow-sm transition-all group-hover:border-[#c8860a] group-hover:bg-white group-hover:shadow-md lg:size-18 lg:text-3xl">
                  {cat.emoji}
                </div>
                <span className="text-[12px] font-semibold text-[#3a3a3a] group-hover:text-[#c8860a]">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── New Arrivals CTA ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-350 px-6 py-10 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[20px] font-extrabold text-[#1a1a1a]">New Arrivals</h2>
          <Link
            href="/dashboard/marketplace"
            className="flex items-center gap-1 text-[13px] font-semibold text-[#c8860a] transition-colors hover:text-[#b5750a]"
          >
            View All →
          </Link>
        </div>

        {/* Quick-link cards for sub-sections instead of Quick Actions */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Products",    sub: "Browse all products", href: "/dashboard/marketplace", emoji: "🛍️" },
            { label: "My Orders",   sub: "Track your deliveries", href: "/dashboard/orders",     emoji: "📦" },
            { label: "Cart",        sub: "Review & checkout",    href: "/dashboard/cart",        emoji: "🛒" },
            { label: "Support",     sub: "We're here to help",   href: "/dashboard/support",     emoji: "💬" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col gap-3 rounded-2xl border border-[#e5e0d8] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#c8860a] hover:shadow-md"
            >
              <span className="text-3xl">{item.emoji}</span>
              <div>
                <p className="text-[15px] font-bold text-[#1a1a1a] group-hover:text-[#c8860a]">
                  {item.label}
                </p>
                <p className="mt-0.5 text-[12px] text-[#6b6b6b]">{item.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
