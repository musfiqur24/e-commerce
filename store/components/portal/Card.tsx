import { HTMLAttributes } from "react";

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode | string;
  subtitle?: React.ReactNode | string;
  headerAction?: React.ReactNode;
  headerClassName?: string;
  titleClassName?: string;
  footer?: React.ReactNode;
  variant?: "default" | "flat";
  noPadding?: boolean;
  noHeaderBorder?: boolean;
}

export default function Card({
  title,
  subtitle,
  headerAction,
  headerClassName = "",
  titleClassName = "",
  footer,
  variant = "default",
  noPadding = false,
  noHeaderBorder = false,
  className = "",
  children,
  ...props
}: CardProps) {
  const baseClasses = "bg-white rounded-xl";

  const variantClasses =
    variant === "default"
      ? "border border-neutral-200 shadow-sm"
      : "border border-neutral-100";

  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {(title || headerAction) && (
        <div className={`flex items-center justify-between px-4 py-3 min-h-13 ${noHeaderBorder ? "" : "border-b border-neutral-200"} ${headerClassName}`}>
          <div className="flex-1">
            {title && (
              <h3 className={`text-sm font-medium text-neutral-900 leading-none ${titleClassName}`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-[11px] text-neutral-500">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className={noPadding ? "" : "p-4"}>{children}</div>

      {footer && (
        <div className="border-t border-neutral-200 px-5 sm:px-6 py-4">{footer}</div>
      )}
    </div>
  );
}
