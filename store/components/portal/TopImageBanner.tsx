interface TopImageBannerProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function TopImageBanner({
  title,
  subtitle,
  className = "",
}: TopImageBannerProps) {
  return (
    <div
      className={`relative flex min-h-[68px] flex-col justify-center overflow-hidden rounded-lg bg-cover bg-center bg-no-repeat px-4 text-white lg:px-6 ${className}`}
      style={{
        backgroundImage: "url('/assets/Top_Nav.png')",
      }}
    >
      {subtitle && (
        <p className="text-[16px] leading-[1.1] font-medium text-[#f9f9f9]">
          {subtitle}
        </p>
      )}
      <h1 className="mt-1 text-2xl leading-[1.25] font-medium tracking-[-0.23px] text-[#f9f9f9]">
        {title}
      </h1>
    </div>
  );
}
