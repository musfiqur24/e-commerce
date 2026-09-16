'use client'

import React from 'react'
import { PlusMini, MinusMini, Trash } from '@medusajs/icons'
import StatusBadge from './StatusBadge'
import type { CartItem } from '@/types/cart'
import { formatAud } from '@/lib/currency'

interface CartItemCardProps {
  item: CartItem
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
}

export default function CartItemCard({ item, onUpdateQuantity, onRemove }: CartItemCardProps) {
  const { product, quantity } = item
  const maxQuantity = product.maxQuantity ?? Number.POSITIVE_INFINITY
  const canIncrease = quantity < maxQuantity

  const getTypeColor = (type?: string) => {
    if (!type) return 'grey'
    const t = type.toLowerCase()
    if (t.includes('oral')) return 'orange'
    if (t.includes('injectable')) return 'purple'
    return 'grey'
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-5 flex-1 min-w-0">
        {/* Product Image */}
        <div className="w-13 h-13 shrink-0 flex items-center justify-center bg-transparent">
          {product.imageSrc ? (
            <img
              src={product.imageSrc}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-neutral-100 rounded-md" />
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-center min-w-0">
          <div className="mb-1.5 flex items-center">
            <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded text-[11px] font-medium">
              {product.category || 'Medication'}
            </span>
          </div>
          <h3 className="text-[15px] font-medium text-neutral-900 truncate">
            {product.name}
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-8 shrink-0">
        {/* Quantity Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onUpdateQuantity(product.id, quantity - 1)}
            className="w-8 h-8 rounded-md border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:bg-neutral-50 shadow-sm"
            aria-label="Decrease quantity"
          >
            <MinusMini className="w-4 h-4" />
          </button>
          <div className="w-11 h-8 rounded-md border border-neutral-200 bg-[#FAFAFA] flex items-center justify-center text-sm font-medium text-neutral-900 shadow-sm">
            {quantity}
          </div>
          <button
            onClick={() => onUpdateQuantity(product.id, quantity + 1)}
            disabled={!canIncrease}
            className="w-8 h-8 rounded-md border border-neutral-200 bg-[#F5F5F5] flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Increase quantity"
          >
            <PlusMini className="w-4 h-4" />
          </button>
        </div>

        {/* Price & Remove */}
        <div className="flex flex-col items-end gap-1.5 w-22.5">
          <span className="text-[17px] font-medium text-neutral-900">
            {formatAud(product.price * quantity)}
          </span>
          <button
            onClick={() => onRemove(product.id)}
            className="flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-red-600 transition-colors"
          >
            <Trash className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
