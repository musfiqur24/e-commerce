import Link from 'next/link'
import { TriangleRightMini } from '@medusajs/icons'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  mutedCurrent?: boolean
}

export default function Breadcrumb({
  items,
  className = '',
  mutedCurrent = false,
}: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-xs text-neutral-400 ${className}`}
    >
      <span className="text-neutral-300">/</span>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-neutral-600 transition-colors underline underline-offset-2"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? mutedCurrent
                      ? 'text-[#757575] underline underline-offset-2'
                      : 'text-neutral-900'
                    : ''
                }
              >
                {item.label}
              </span>
            )}
            {!isLast && <TriangleRightMini className="text-neutral-400 w-3.5 h-3.5" />}
          </span>
        )
      })}
    </nav>
  )
}
