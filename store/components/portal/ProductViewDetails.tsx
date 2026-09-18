'use client'

import React, { useEffect, useState } from 'react'
import { PlusMini, XMark } from '@medusajs/icons'
import Button from './Button'
import type { Product } from './ProductCard'
import { formatBdt } from '@/lib/currency'
import { canPurchase, stockMessage } from '@/lib/inventory'

interface ProductViewDetailsProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart?: (product: Product) => void
}

export default function ProductViewDetails({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: ProductViewDetailsProps) {
  const [selectedId, setSelectedId] = useState('')
  const selected = product?.variants?.find(variant => variant.id === selectedId)
    ?? product?.variants?.find(canPurchase) ?? product?.variants?.[0]
  const message = stockMessage(selected?.available)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !product) return null

  const categories = product.categories?.length
    ? product.categories
    : [product.category]

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} details`}
          className="relative max-h-[90vh] w-full max-w-184 overflow-y-auto rounded-lg bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)] animate-scale-in md:p-8"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex w-full items-start justify-end gap-3 md:block">
            <div className="aspect-square min-w-0 flex-1 overflow-hidden rounded-md bg-white md:aspect-auto md:h-75 md:w-full">
              {product.imageSrc ? (
                <img
                  src={product.imageSrc}
                  alt={product.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-neutral-100">
                  <div className="h-24 w-20 rounded-md bg-neutral-200" />
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="relative shrink-0 rounded-md p-1.625 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 md:absolute md:right-6 md:top-4"
              aria-label="Close"
            >
              <XMark className="size-3.75" />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-4 md:mt-6 md:gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start gap-2">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded border-[0.5px] border-[#e0e0e0] bg-[#eee] px-1 py-0.5 text-center text-xs font-normal leading-[1.1] text-[#424242]"
                  >
                    {category}
                  </span>
                ))}
              </div>

              <h2 className="text-2xl font-normal leading-tight tracking-[-0.2304px] text-[#1c1c1c]">
                {product.name}
              </h2>

              <div className="space-y-2 text-base font-normal leading-[1.6] text-[#757575]">
                {product.detailedDescription ? (
                  product.detailedDescription.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))
                ) : (
                  <p>{product.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                {!!product.variants?.length && <label className="block text-sm">
                  Select options
                  <select className="mt-2 block w-full rounded border p-2" value={selected?.id ?? ''} onChange={event => setSelectedId(event.target.value)}>
                    {product.variants.map(variant => <option key={variant.id} value={variant.id}>
                      {Object.entries(variant.options).map(([name, value]) => `${name}: ${value}`).join(' / ') || variant.title}
                      {variant.available === 0 ? ' — Out of stock' : ''}
                    </option>)}
                  </select>
                </label>}
                {message && <p role="status" className="text-sm text-amber-700">{message}</p>}
              <span className="text-4xl font-normal leading-[1.1] tracking-[-0.576px] text-[#1c1c1c]">
                {selected?.price == null ? 'Price unavailable' : formatBdt(selected.price)}
              </span>
              </div>
              <Button
                variant="primary"
                size="small"
                className="h-10 shrink-0 gap-1.5 rounded-md border-0 bg-[#2e2f2f] px-5 text-sm font-normal text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),0_0_0_1px_#18181b,inset_0_0.75px_0_rgba(255,255,255,0.2)] hover:bg-black"
                onClick={() => {
                  if (!selected || !canPurchase(selected)) return
                  onAddToCart?.({ ...product, id: selected.id, productId: product.productId ?? product.id,
                    variantId: selected.id, variantTitle: selected.title, price: selected.price!,
                    available: selected.available, maxQuantity: selected.available ?? undefined })
                  onClose()
                }}
                disabled={!selected || !canPurchase(selected)}
              >
                <PlusMini className="size-3.75" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.25s ease-out;
        }
      `}</style>
    </>
  )
}
