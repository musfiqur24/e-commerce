'use client'

import React from 'react'
import { Eye, PlusMini } from '@medusajs/icons'
import Button from './Button'
import ProductGallery from './ProductGallery'
import { formatBdt } from '@/lib/currency'
import { stockMessage, type ProductVariant } from '@/lib/inventory'

export interface Product {
  id: string
  productId?: string
  variantId?: string
  variantTitle?: string
  variants?: ProductVariant[]
  available?: number | null
  name: string
  description: string
  detailedDescription?: string
  price: number
  category: string
  categories?: string[]
  type?: string
  types?: string[]
  tag?: string
  tags?: string[]
  imageSrc?: string
  images?: string[]
  productPdfUrl?: string | null
  maxQuantity?: number
}

interface ProductCardProps {
  product: Product
  onViewDetails?: (product: Product) => void
  onAddToCart?: (product: Product) => void
}

export default function ProductCard({ product, onViewDetails, onAddToCart }: ProductCardProps) {
  const message = stockMessage(product.available)
  const hasOptions = (product.variants?.length ?? 0) > 1
  return (
    <div className="group flex h-full w-full flex-col items-start gap-4 overflow-hidden rounded-lg bg-white p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.1)] md:p-6">
      {/* Product Image */}
      <ProductGallery key={product.id} name={product.name} images={[product.imageSrc || '', ...(product.images || [])]} />

      {/* Product Info */}
      <div className="flex w-full flex-1 flex-col justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-2xl font-normal leading-tight tracking-[-0.2304px] text-[#1c1c1c]">{product.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-[13px] font-normal leading-[1.6] text-[#757575]">{product.description}</p>
          {message && <p role="status" className="mt-2 text-sm font-medium text-amber-700">{message}</p>}
        </div>

        <div className="flex flex-col gap-4">
          {/* Price & Category */}
          <div className="flex items-end justify-between gap-4">
            <span className="text-4xl font-normal leading-[1.1] tracking-[-0.576px] text-[#1c1c1c]">{formatBdt(product.price)}</span>
            <span className="shrink-0 rounded border-[0.5px] border-[#e0e0e0] bg-[#eee] px-1 py-0.5 text-center text-xs font-normal leading-[1.1] text-[#424242]">
              {product.category}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="secondary"
              size="small"
              className="h-10 flex-1 gap-1.5 rounded-md border-0 bg-white px-5 text-sm font-normal text-[#1c1c1c] shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)] hover:bg-neutral-50"
              onClick={() => onViewDetails?.(product)}
            >
              <Eye className="size-3.75" />
              View Details
            </Button>
            <Button
              variant="primary"
              size="small"
              className="h-10 flex-1 gap-1.5 rounded-md border-0 bg-[#2e2f2f] px-5 text-sm font-normal text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),0_0_0_1px_#18181b,inset_0_0.75px_0_rgba(255,255,255,0.2)] hover:bg-black"
              disabled={product.available === 0 || product.price <= 0}
              onClick={() => hasOptions ? onViewDetails?.(product) : onAddToCart?.(product)}
            >
              <PlusMini className="size-3.75" />
              {product.available === 0 ? 'Out of stock' : hasOptions ? 'Choose options' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
