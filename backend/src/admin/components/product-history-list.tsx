import { Button, Container, Heading, Input, Text } from '@medusajs/ui'
import { useEffect, useState } from 'react'
import InventoryHistoryTable from './inventory-history-table'

type ProductGroup = { id: string; title: string; movement_count: number; variant_count: number }

export default function ProductHistoryList() {
  const [products, setProducts] = useState<ProductGroup[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ group_by: 'product', limit: '20', offset: String(page * 20), q: search })
      fetch('/admin/inventory-history?' + params, { credentials: 'include', signal: abort.signal })
        .then(async response => { if (!response.ok) throw new Error('Could not load inventory history'); return response.json() })
        .then(data => { setProducts(data.products); setCount(data.count) })
        .catch(err => { if (!abort.signal.aborted) setError(err.message) })
        .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    }, 200)
    return () => { clearTimeout(timer); abort.abort() }
  }, [page, search, refresh])

  return <Container className="divide-y p-0">
    <div className="flex items-start justify-between px-6 py-4">
      <div><Heading level="h2">Inventory history</Heading><Text size="small" className="text-ui-fg-subtle">Expand a product to see its variant movements and warehouse balances.</Text></div>
      <Button variant="secondary" size="small" onClick={() => setRefresh(value => value + 1)}>Refresh</Button>
    </div>
    <div className="px-6 py-4"><Input aria-label="Search product history" placeholder="Search product or SKU" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} /></div>
    {error ? <Text className="px-6 py-4 text-ui-fg-error">{error}</Text> : loading ? <Text className="px-6 py-4">Loading history...</Text> : products.length ? products.map(product => <div key={product.id}>
      <button type="button" className="flex w-full items-center gap-x-3 px-6 py-4 text-left hover:bg-ui-bg-base-hover txt-small-plus" aria-expanded={!!expanded[product.id]} aria-controls={'history-' + product.id} onClick={() => setExpanded(value => ({ ...value, [product.id]: !value[product.id] }))}>
        <span aria-hidden="true">{expanded[product.id] ? '\u25be' : '\u25b8'}</span>
        {product.title}
        <span className="ml-auto text-ui-fg-subtle txt-small">{product.variant_count} variants · {product.movement_count} entries</span>
      </button>
      {expanded[product.id] && <div id={'history-' + product.id} className="border-t border-ui-border-base"><InventoryHistoryTable key={product.id + ':' + refresh} productId={product.id} nested /></div>}
    </div>) : <Text className="px-6 py-4">No products found.</Text>}
    <div className="flex items-center justify-end gap-3 px-6 py-4"><Text size="small">{count} products</Text><Button size="small" variant="secondary" disabled={!page || loading} onClick={() => setPage(page - 1)}>Previous</Button><Button size="small" variant="secondary" disabled={(page + 1) * 20 >= count || loading} onClick={() => setPage(page + 1)}>Next</Button></div>
  </Container>
}
