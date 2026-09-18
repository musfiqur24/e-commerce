'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { PlusMini, XMark, CheckCircleSolid } from '@medusajs/icons'
import type { Product } from './ProductCard'
import { formatBdt } from '@/lib/currency'
import { canPurchase, stockMessage, type ProductVariant } from '@/lib/inventory'

const COLOR_MAP: Record<string, string> = {
  // Monochromes
  black: '#171717',
  charcoal: '#2e2e2e',
  jet: '#1a1a1a',
  onyx: '#0f0f0f',
  white: '#ffffff',
  'off-white': '#f8f8f6',
  'off white': '#f8f8f6',
  cream: '#fdf6e7',
  ivory: '#fffff0',
  grey: '#6b7280',
  gray: '#6b7280',
  'light grey': '#d1d5db',
  'light gray': '#d1d5db',
  'dark grey': '#374151',
  'dark gray': '#374151',
  silver: '#c0c0c0',
  heather: '#9ca3af',
  ash: '#b2b2b2',
  slate: '#64748b',

  // Earth & Browns
  brown: '#78350f',
  tan: '#d2b48c',
  camel: '#c19a6b',
  khaki: '#c3b091',
  beige: '#e8dcce',
  sand: '#e2d5c3',
  coffee: '#4a2c11',
  chocolate: '#3e2723',
  terracotta: '#a04022',
  rust: '#b45309',
  nude: '#ebd3be',
  taupe: '#8b8589',
  olive: '#556b2f',
  amber: '#d97706',

  // Reds & Pinks
  red: '#dc2626',
  crimson: '#be123c',
  maroon: '#800000',
  burgundy: '#6b1724',
  wine: '#5e1927',
  rose: '#e11d48',
  coral: '#f43f5e',
  pink: '#ec4899',
  'hot pink': '#ff1493',
  'light pink': '#fbcfe8',
  blush: '#f5d0c5',
  salmon: '#fa8072',
  peach: '#fbc4ab',
  magenta: '#c026d3',

  // Blues
  blue: '#2563eb',
  navy: '#0f172a',
  'navy blue': '#0f172a',
  'royal blue': '#1d4ed8',
  'sky blue': '#38bdf8',
  'light blue': '#93c5fd',
  cobalt: '#0047ab',
  indigo: '#4f46e5',
  teal: '#0d9488',
  cyan: '#06b6d4',
  denim: '#224363',
  turquoise: '#14b8a6',

  // Greens
  green: '#16a34a',
  'dark green': '#14532d',
  'light green': '#86efac',
  emerald: '#059669',
  mint: '#6ee7b7',
  sage: '#9ca986',
  forest: '#1b4d3e',
  'forest green': '#1b4d3e',
  lime: '#84cc16',
  army: '#4b5320',

  // Yellows & Oranges
  yellow: '#eab308',
  mustard: '#ca8a04',
  gold: '#d4af37',
  orange: '#ea580c',
  copper: '#b87333',

  // Purples
  purple: '#9333ea',
  violet: '#7c3aed',
  lavender: '#c4b5fd',
  lilac: '#c8a2c8',
  plum: '#4e144a',
  mauve: '#915f6d',
}

function getColorHex(colorName: string): string {
  const normalized = colorName.trim().toLowerCase()
  if (COLOR_MAP[normalized]) {
    return COLOR_MAP[normalized]
  }
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return hex
    }
  }
  return colorName
}

function isLightColor(colorHex: string): boolean {
  const hex = colorHex.replace('#', '')
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.8
  }
  return ['white', 'off-white', 'off white', 'cream', 'ivory', 'beige', 'yellow'].includes(colorHex.toLowerCase())
}

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
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [activeImage, setActiveImage] = useState('')

  const variants = useMemo(() => product?.variants || [], [product])

  // Discover option keys (e.g. Color, Size, etc.)
  const { colorKey, sizeKey, otherKeys } = useMemo(() => {
    const optKeys = Array.from(new Set(variants.flatMap((v) => Object.keys(v.options || {}))))
    const cKey = optKeys.find((k) => /^(colou?r|shade|hue)/i.test(k.trim()))
    const sKey = optKeys.find((k) => /^(size|dimension|fit)/i.test(k.trim()))
    const others = optKeys.filter((k) => k !== cKey && k !== sKey)
    return { colorKey: cKey, sizeKey: sKey, otherKeys: others }
  }, [variants])

  // Initialize selections when product changes
  useEffect(() => {
    if (product) {
      const defaultVariant = product.variants?.find(canPurchase) ?? product.variants?.[0]
      setSelectedId(defaultVariant?.id ?? '')
      setActiveImage(product.imageSrc || product.images?.[0] || '')

      if (colorKey) {
        setSelectedColor(defaultVariant?.options?.[colorKey] || variants[0]?.options?.[colorKey] || '')
      } else {
        setSelectedColor('')
      }

      if (sizeKey) {
        setSelectedSize(defaultVariant?.options?.[sizeKey] || variants[0]?.options?.[sizeKey] || '')
      } else {
        setSelectedSize('')
      }
    }
  }, [product, colorKey, sizeKey, variants])

  // Available unique colors
  const availableColors = useMemo(() => {
    if (!colorKey) return []
    return Array.from(
      new Set(
        variants
          .map((v) => v.options?.[colorKey])
          .filter((c): c is string => Boolean(c))
      )
    )
  }, [variants, colorKey])

  // Available sizes for the selected color (or all sizes)
  const availableSizes = useMemo(() => {
    if (!sizeKey) return []
    const matchingColorVariants = colorKey && selectedColor
      ? variants.filter((v) => v.options?.[colorKey] === selectedColor)
      : variants

    return Array.from(
      new Set(
        matchingColorVariants
          .map((v) => v.options?.[sizeKey])
          .filter((s): s is string => Boolean(s))
      )
    )
  }, [variants, sizeKey, colorKey, selectedColor])

  // Active selected variant
  const selected = useMemo(() => {
    return variants.find((v) => v.id === selectedId)
      ?? variants.find((v) => {
        const cMatch = !colorKey || !selectedColor || v.options?.[colorKey] === selectedColor
        const sMatch = !sizeKey || !selectedSize || v.options?.[sizeKey] === selectedSize
        return cMatch && sMatch
      })
      ?? variants.find(canPurchase)
      ?? variants[0]
  }, [variants, selectedId, colorKey, selectedColor, sizeKey, selectedSize])

  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor)
    // Find matching variant with current size, or switch to first available size for this color
    let matching = variants.find(
      (v) =>
        (colorKey ? v.options?.[colorKey] === newColor : true) &&
        (sizeKey ? v.options?.[sizeKey] === selectedSize : true)
    )

    if (!matching) {
      matching = variants.find((v) => (colorKey ? v.options?.[colorKey] === newColor : true))
      if (matching && sizeKey && matching.options?.[sizeKey]) {
        setSelectedSize(matching.options[sizeKey])
      }
    }

    if (matching) {
      setSelectedId(matching.id)
    }
  }

  const handleSizeChange = (newSize: string) => {
    setSelectedSize(newSize)
    const matching = variants.find(
      (v) =>
        (colorKey ? v.options?.[colorKey] === selectedColor : true) &&
        (sizeKey ? v.options?.[sizeKey] === newSize : true)
    ) ?? variants.find((v) => (sizeKey ? v.options?.[sizeKey] === newSize : true))

    if (matching) {
      setSelectedId(matching.id)
    }
  }

  const message = stockMessage(selected?.available)
  const isAvailable = selected ? canPurchase(selected) : (product?.available ?? 1) > 0

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
    : [product.category].filter(Boolean)

  const allImages = [...new Set([product.imageSrc, ...(product.images || [])].filter(Boolean) as string[])]
  const displayImage = activeImage || product.imageSrc || allImages[0] || ''

  const price = selected?.price ?? product.price
  const hasMultipleVariants = variants.length > 1
  const hasSeparatedOptions = Boolean(colorKey || sizeKey)

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} details`}
          className="relative my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-scale-in"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex size-8 items-center justify-center rounded-full bg-white/90 text-neutral-500 shadow-sm backdrop-blur-xs transition hover:bg-white hover:text-neutral-900 md:hidden"
            aria-label="Close"
          >
            <XMark className="size-4" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left Column: Product Visuals */}
            <div className="flex flex-col justify-between bg-[#faf9f6] p-6 md:col-span-5 md:p-8 md:border-r md:border-neutral-100">
              {/* Category Pill Tag */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-600 shadow-xs ring-1 ring-neutral-200/70"
                  >
                    {category}
                  </span>
                ))}
              </div>

              {/* Main Image Frame */}
              <div className="relative my-4 flex h-64 w-full items-center justify-center rounded-xl bg-white/60 p-4 ring-1 ring-neutral-200/50 sm:h-72 md:h-80">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400">
                    <div className="size-16 rounded-lg bg-neutral-100" />
                    <span className="mt-2 text-xs">No image available</span>
                  </div>
                )}
              </div>

              {/* Gallery Thumbnails Strip (if multiple images) */}
              {allImages.length > 1 ? (
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`relative size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white p-1 transition ${
                        displayImage === img
                          ? 'border-neutral-900 shadow-xs'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="size-full object-contain" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-[11px] text-neutral-400">
                  Posora Marketplace Verified
                </div>
              )}
            </div>

            {/* Right Column: Product Info & Configuration */}
            <div className="flex flex-col justify-between p-6 sm:p-8 md:col-span-7">
              <div>
                {/* Header Row: Category path & Desktop Close */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    {product.type || product.category || 'Product Details'}
                  </span>
                  <button
                    onClick={onClose}
                    className="hidden size-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 md:flex"
                    aria-label="Close"
                  >
                    <XMark className="size-4" />
                  </button>
                </div>

                {/* Product Title */}
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                  {product.name}
                </h2>

                {/* Price & Stock Status Bar */}
                <div className="mt-3 flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-bold tracking-tight text-neutral-900">
                    {price == null ? 'Price unavailable' : formatBdt(price)}
                  </span>
                  {isAvailable ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                      <span className="size-1.5 rounded-full bg-emerald-600" />
                      In Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-600/20">
                      <span className="size-1.5 rounded-full bg-rose-600" />
                      Out of Stock
                    </span>
                  )}
                  {message && !isAvailable && (
                    <span className="text-xs font-medium text-amber-700">{message}</span>
                  )}
                </div>

                <div className="my-5 border-t border-neutral-100" />

                {/* Description */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Description
                  </h3>
                  <div className="mt-1.5 max-h-28 overflow-y-auto pr-2 text-sm leading-relaxed text-neutral-600">
                    {product.detailedDescription ? (
                      product.detailedDescription.split('\n\n').map((paragraph, index) => (
                        <p key={index} className="mb-2 last:mb-0">{paragraph}</p>
                      ))
                    ) : (
                      <p>{product.description || 'No description provided for this item.'}</p>
                    )}
                  </div>
                </div>

                {/* Variant Configuration (Color swatches & Size dropdown) */}
                {hasMultipleVariants && (
                  <div className="mt-5 space-y-4">
                    {/* Color Swatches */}
                    {colorKey && availableColors.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2.5">
                          <span>Color</span>
                          {selectedColor && (
                            <span className="font-normal normal-case text-neutral-500">
                              {selectedColor}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Select color">
                          {availableColors.map((color) => {
                            const hex = getColorHex(color)
                            const isSelected = selectedColor === color
                            const isLight = isLightColor(hex)
                            return (
                              <button
                                key={color}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`Color: ${color}`}
                                title={color}
                                onClick={() => handleColorChange(color)}
                                className={`flex size-7 items-center justify-center rounded-full p-0.5 transition-all focus:outline-hidden ${
                                  isSelected
                                    ? 'border border-neutral-900'
                                    : 'border border-transparent hover:border-neutral-300'
                                }`}
                              >
                                <span
                                  className={`size-5 rounded-full transition-transform ${
                                    isLight ? 'border border-neutral-200' : ''
                                  }`}
                                  style={{ backgroundColor: hex }}
                                />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Size Selector Dropdown */}
                    {sizeKey && availableSizes.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                          <span>Size</span>
                          {selectedSize && (
                            <span className="font-normal normal-case text-neutral-500">
                              {selectedSize}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <select
                            className="w-full appearance-none rounded-xl border border-neutral-200 bg-white py-2.5 pl-3.5 pr-10 text-sm font-medium text-neutral-800 shadow-xs transition hover:border-neutral-300 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                            value={selectedSize}
                            onChange={(e) => handleSizeChange(e.target.value)}
                          >
                            {availableSizes.map((size) => {
                              const variantForThisSize = variants.find(
                                (v) =>
                                  (!colorKey || v.options?.[colorKey] === selectedColor) &&
                                  v.options?.[sizeKey] === size
                              )
                              const inStock = variantForThisSize ? canPurchase(variantForThisSize) : false
                              return (
                                <option key={size} value={size}>
                                  {size} {!inStock ? '— (Out of stock)' : ''}
                                </option>
                              )
                            })}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400">
                            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fallback Option Dropdown if neither Color nor Size key */}
                    {!hasSeparatedOptions && (
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                          <span>Select Option</span>
                          {selected && (
                            <span className="font-normal normal-case text-neutral-500">
                              {selected.title}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <select
                            className="w-full appearance-none rounded-xl border border-neutral-200 bg-white py-2.5 pl-3.5 pr-10 text-sm font-medium text-neutral-800 shadow-xs transition hover:border-neutral-300 focus:border-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                            value={selected?.id ?? ''}
                            onChange={(event) => setSelectedId(event.target.value)}
                          >
                            {variants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {Object.entries(variant.options).map(([name, value]) => `${name}: ${value}`).join(' / ') || variant.title}
                                {variant.available === 0 ? ' — (Out of stock)' : ''}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400">
                            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Purchase Action CTA */}
              <div className="mt-6 border-t border-neutral-100 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    if (!selected || !canPurchase(selected)) return
                    onAddToCart?.({
                      ...product,
                      id: selected.id,
                      productId: product.productId ?? product.id,
                      variantId: selected.id,
                      variantTitle: selected.title,
                      price: selected.price ?? product.price,
                      available: selected.available,
                      maxQuantity: selected.available ?? undefined,
                    })
                    onClose()
                  }}
                  disabled={!selected || !canPurchase(selected)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-black active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none"
                >
                  <PlusMini className="size-4" />
                  <span>
                    {isAvailable ? `Add to Cart — ${formatBdt(price)}` : 'Out of Stock'}
                  </span>
                </button>

                {/* Trust Badges */}
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <CheckCircleSolid className="size-3 text-neutral-400" />
                    Verified Item
                  </span>
                  <span>•</span>
                  <span>Direct Delivery</span>
                  <span>•</span>
                  <span>Secure Checkout</span>
                </div>
              </div>
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
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  )
}
