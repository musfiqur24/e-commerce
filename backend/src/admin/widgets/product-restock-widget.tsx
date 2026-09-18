import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { Button, Container, Heading, Input, Label, Select, Text, toast } from '@medusajs/ui'
import { useEffect, useState } from 'react'

type Variant = { id: string; title: string }
type Location = { id: string; name: string }
export default function ProductRestockWidget({ data }: { data: { id: string } }) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [locationId, setLocationId] = useState('')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch(`/admin/products/${data.id}/restock`, { credentials: 'include', signal: controller.signal }).then(res => res.ok ? res.json() : Promise.reject(new Error('Could not load product variants'))),
      fetch('/admin/stock-locations?limit=1000', { credentials: 'include', signal: controller.signal }).then(res => res.ok ? res.json() : Promise.reject(new Error('Could not load warehouses'))),
    ]).then(([product, warehouse]) => {
      setVariants(product.variants)
      setLocations(warehouse.stock_locations)
      if (warehouse.stock_locations.length === 1) setLocationId(warehouse.stock_locations[0].id)
    }).catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [data.id])
  const receive = async () => {
    const adjustments = Object.entries(quantities)
      .filter(([, quantity]) => quantity !== '')
      .map(([variant_id, quantity]) => ({ variant_id, quantity: Number(quantity) }))
      .filter(entry => Number.isSafeInteger(entry.quantity) && entry.quantity > 0)
    if (!locationId) return toast.error('Select a warehouse')
    if (!adjustments.length) return toast.error('Enter a received quantity for at least one variant')
    setSaving(true)
    try {
      const response = await fetch(`/admin/products/${data.id}/restock`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId, adjustments }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Could not add stock')
      setQuantities({})
      toast.success('Stock added', { description: `Received stock was added to ${adjustments.length} variant${adjustments.length === 1 ? '' : 's'}.` })
    } catch (err) {
      toast.error('Could not add stock', { description: err instanceof Error ? err.message : 'Try again.' })
    } finally { setSaving(false) }
  }
  if (error) return <Container><Text className="text-ui-fg-error">{error}</Text></Container>
  if (!variants.length) return null
  return <Container className="divide-y p-0">
    <div className="px-6 py-4"><Heading level="h2">Receive stock</Heading><Text size="small" className="text-ui-fg-subtle">Add quantities from a new shipment. This increases current stock; it never replaces it.</Text></div>
    <div className="flex flex-col gap-y-4 px-6 py-4">
      <div className="flex max-w-sm flex-col gap-y-2"><Label size="small" weight="plus">Warehouse</Label><Select value={locationId} onValueChange={setLocationId}><Select.Trigger><Select.Value placeholder="Select warehouse" /></Select.Trigger><Select.Content>{locations.map(location => <Select.Item key={location.id} value={location.id}>{location.name}</Select.Item>)}</Select.Content></Select></div>
      <div className="grid gap-3 md:grid-cols-2">{variants.map(variant => <label key={variant.id} className="flex items-center justify-between gap-3"><Label size="small" weight="plus">{variant.title}</Label><Input className="max-w-36" type="number" min={1} step={1} placeholder="Received" value={quantities[variant.id] || ''} onChange={event => setQuantities(current => ({ ...current, [variant.id]: event.target.value }))} /></label>)}</div>
      <div><Button type="button" size="small" isLoading={saving} onClick={receive}>Add received stock</Button></div>
    </div>
  </Container>
}
export const config = defineWidgetConfig({ zone: 'product.details.after' })
