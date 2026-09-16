'use client'

import React from 'react'

interface StatusBadgeProps {
  color?: 'blue' | 'orange' | 'green' | 'yellow' | 'purple' | 'red' | 'magenta' | 'grey' | string
  children: React.ReactNode
  className?: string
}

export default function StatusBadge({ color = 'grey', children, className = '' }: StatusBadgeProps) {
  const colorStyles: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    magenta: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
    grey: 'bg-neutral-50 text-neutral-600 border-neutral-200',
  }

  const dotColors: Record<string, string> = {
    blue: 'bg-blue-600',
    orange: 'bg-orange-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    purple: 'bg-purple-600',
    red: 'bg-red-600',
    magenta: 'bg-fuchsia-600',
    grey: 'bg-neutral-600',
  }

  const style = colorStyles[color] || colorStyles.grey
  const dotStyle = dotColors[color] || dotColors.grey

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border ${style} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
      {children}
    </span>
  )
}
