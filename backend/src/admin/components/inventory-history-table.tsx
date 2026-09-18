import { Button, Container, Heading, Input, Select, Table, Text } from '@medusajs/ui'
import { useEffect, useState } from 'react'

type Movement = {
  id: string; kind: string; created_at: string; location_id: string
  payload: { products: { id: string; title: string; variant: string }[]; sku?: string; warehouse?: string
    stock_before: number; stock_after: number; stock_change: number; reserved_after: number; reserved_change: number }
}
const labels: Record<string, string> = { opening: 'Opening balance', incoming: 'Incoming', outgoing: 'Outgoing', reserved: 'Reserved', released: 'Reservation released' }

export default function InventoryHistoryTable({ productId, nested = false }: { productId?: string; nested?: boolean }) {
  const [rows, setRows] = useState<Movement[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: '25', offset: String(page * 25), q: search })
      if (productId) params.set('product_id', productId)
      if (kind !== 'all') params.set('kind', kind)
      fetch('/admin/inventory-history?' + params, { credentials: 'include', signal: abort.signal })
        .then(async response => { if (!response.ok) throw new Error('Could not load inventory history'); return response.json() })
        .then(data => { setRows(data.movements); setCount(data.count); setError('') })
        .catch(err => { if (!abort.signal.aborted) setError(err.message) })
        .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    }, 200)
    return () => { clearTimeout(timer); abort.abort() }
  }, [productId, page, search, kind, refresh])
  return <Container className={nested ? 'divide-y rounded-none border-0 p-0 shadow-none' : 'divide-y p-0'}>
    <div className={nested ? 'hidden' : 'flex items-start justify-between px-6 py-4'}>
      <div><Heading level="h2">Inventory history</Heading><Text size="small" className="text-ui-fg-subtle">Stock movements and reservations by product, variant, and warehouse. Opening balances mark when tracking began.</Text></div>
      <Button variant="secondary" size="small" onClick={() => setRefresh(value => value + 1)}>Refresh</Button>
    </div>
    <div className="flex gap-3 px-6 py-4">
      <Input aria-label="Search inventory history" placeholder="Search product or SKU" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} />
      <Select value={kind} onValueChange={value => { setKind(value); setPage(0) }}><Select.Trigger className="w-56 shrink-0" aria-label="Movement type"><Select.Value /></Select.Trigger><Select.Content><Select.Item value="all">All movements</Select.Item>{Object.entries(labels).map(([value, label]) => <Select.Item key={value} value={value}>{label}</Select.Item>)}</Select.Content></Select>
    </div>
    {error ? <Text className="px-6 py-4 text-ui-fg-error">{error}</Text> : <div className="overflow-x-auto"><Table>
      <Table.Header><Table.Row>{['Date', 'Product / Variant', 'Warehouse', 'Movement', 'Quantity', 'Stock balance', 'Reserved'].map(label => <Table.HeaderCell key={label}>{label}</Table.HeaderCell>)}</Table.Row></Table.Header>
      <Table.Body>{loading ? <Table.Row><td colSpan={7} className="px-6 py-4 txt-small">Loading history…</td></Table.Row> : rows.length ? rows.map(row => <Table.Row key={row.id}>
        <Table.Cell className="whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</Table.Cell>
        <Table.Cell>{row.payload.products?.length ? row.payload.products.map((product, index) => <div key={product.id + index}><Text size="small" weight="plus">{product.title}</Text><Text size="small" className="text-ui-fg-subtle">{product.variant}{row.payload.sku ? ' · ' + row.payload.sku : ''}</Text></div>) : row.payload.sku || 'Unlinked inventory item'}</Table.Cell>
        <Table.Cell>{row.payload.warehouse || row.location_id}</Table.Cell>
        <Table.Cell>{labels[row.kind] || row.kind}</Table.Cell>
        <Table.Cell>{row.kind === 'opening' ? '—' : row.kind === 'reserved' || row.kind === 'released' ? Math.abs(row.payload.reserved_change) : Math.abs(row.payload.stock_change)}</Table.Cell>
        <Table.Cell>{row.payload.stock_before} → {row.payload.stock_after}</Table.Cell>
        <Table.Cell>{row.payload.reserved_after}</Table.Cell>
      </Table.Row>) : <Table.Row><td colSpan={7} className="px-6 py-4 txt-small">No movements found.</td></Table.Row>}</Table.Body>
    </Table></div>}
    <div className="flex items-center justify-end gap-3 px-6 py-4"><Text size="small">{count} entries</Text><Button size="small" variant="secondary" disabled={!page || loading} onClick={() => setPage(page - 1)}>Previous</Button><Button size="small" variant="secondary" disabled={(page + 1) * 25 >= count || loading} onClick={() => setPage(page + 1)}>Next</Button></div>
  </Container>
}
