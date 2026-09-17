import { Input, Text } from '@medusajs/ui'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { stockOptionKey, type InitialStock } from '../../lib/product-stock'

type Variant = { title: string; options: Record<string, string>; should_create: boolean; inventory_kit?: boolean }
export function ProductStockField({ value, onChange }: { value?: InitialStock | null; onChange: (value: InitialStock | null) => void }) {
  const form = useFormContext()
  const variants: Variant[] = useWatch({ control: form.control, name: 'variants' }) || []
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState('')
  const [warehouse, setWarehouse] = useState(value?.location_id || '')
  useEffect(() => {
    const abort = new AbortController()
    fetch('/admin/stock-locations?limit=1000', { signal: abort.signal, credentials: 'include' })
      .then(async res => { if (!res.ok) throw new Error('Could not load warehouses'); return res.json() })
      .then(data => {
        setLocations(data.stock_locations)
        if (data.stock_locations.length === 1) setWarehouse(data.stock_locations[0].id)
      }).catch(err => { if (!abort.signal.aborted) setError(err.message) })
    return () => abort.abort()
  }, [])

  // Remove stock entries when an option/variant is removed or converted to a kit.
  useEffect(() => {
    if (!value) return
    const keys = new Set(variants.filter(v => v.should_create && !v.inventory_kit).map(v => stockOptionKey(v.options)))
    const quantities = value.quantities.filter(entry => keys.has(stockOptionKey(entry.options)))
    if (quantities.length !== value.quantities.length) onChange(quantities.length ? { ...value, quantities } : null)
  }, [variants, value, onChange])

  return <div className="flex flex-col gap-y-3">
    <label className="flex flex-col gap-y-1">
      <Text size="small">Warehouse</Text>
      <select aria-label="Starting stock warehouse" className="bg-ui-bg-field border-ui-border-base rounded-md border p-2" value={warehouse} onChange={event => {
        setWarehouse(event.target.value)
        if (value) onChange({ ...value, location_id: event.target.value })
      }}>
        <option value="">Select warehouse</option>
        {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
      </select>
    </label>
    {error && <Text className="text-ui-fg-error">{error}</Text>}
    {!error && !locations.length && <Text size="small">Create a warehouse under Settings → Locations & Shipping if none is available.</Text>}
    {variants.map((variant, index) => {
      if (!variant.should_create) return null
      const key = stockOptionKey(variant.options)
      const quantity = value?.quantities.find(entry => stockOptionKey(entry.options) === key)?.quantity
      return <label key={key} className="flex items-center justify-between gap-x-4">
        <Text size="small">{variant.title || Object.values(variant.options).join(' / ')}</Text>
        {variant.inventory_kit ? <Text size="small">Uses existing kit inventory</Text> : <Input
          aria-label={`Starting stock for ${variant.title}`} type="number" min={0} step={1}
          className="max-w-[180px]" placeholder="Pieces in stock" value={quantity ?? ''}
          onChange={event => {
            const raw = event.target.value
            const next = raw === '' ? null : Number(raw)
            if (next !== null && (!Number.isSafeInteger(next) || next < 0)) return
            const quantities = (value?.quantities || []).filter(entry => stockOptionKey(entry.options) !== key)
            if (next !== null) {
              quantities.push({ options: variant.options, quantity: next })
              form.setValue(`variants.${index}.manage_inventory`, true, { shouldDirty: true })
            }
            onChange(quantities.length ? { location_id: warehouse, quantities } : null)
          }} />}
      </label>
    })}
    <Text size="small" className="text-ui-fg-subtle">Entering stock enables managed inventory. Use a warehouse linked to the product’s sales channel.</Text>
  </div>
}
