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
    <div className={`border-b border-[#e5e0d8] bg-white px-6 pb-4 pt-5 lg:px-8 ${className}`}>
      {subtitle && (
        <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#c8860a]">
          {subtitle}
        </p>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a] lg:text-3xl">
        {title}
      </h1>
    </div>
  );
}
