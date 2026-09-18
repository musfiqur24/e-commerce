interface TopImageBannerProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * Slim page-title header — replaces the old full-bleed dark image banner.
 * Clean, lightweight, matches the warm palette.
 */
export default function TopImageBanner({
  title,
  subtitle,
  className = "",
}: TopImageBannerProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#e8d9b8] px-6 pb-5 pt-6 lg:px-8 ${className}`}
      style={{
        background: "linear-gradient(135deg, #fdf3e0 0%, #faf0d7 50%, #f5e8c8 100%)",
        boxShadow: "0 1px 3px rgba(120,80,20,0.08), 0 4px 12px rgba(120,80,20,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      {/* Decorative amber left accent */}
      <span className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-[#c8860a] opacity-80" />

      {/* Decorative warm circle blob */}
      <span
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #e6a830 0%, transparent 70%)" }}
      />

      <div className="relative pl-4">
        {subtitle && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#a06b00]">
            {subtitle}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a] lg:text-3xl">
          {title}
        </h1>
      </div>
    </div>
  );
}
