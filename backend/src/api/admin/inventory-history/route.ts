import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const conditions: string[] = ['deleted_at IS NULL']
  const params: any[] = []
  if (req.query.product_id === '__unlinked__') {
    conditions.push(`COALESCE(jsonb_array_length(payload->'products'), 0) = 0`)
  } else if (typeof req.query.product_id === 'string' && req.query.product_id) {
    conditions.push(`payload->'products' @> ?::jsonb`)
    params.push(JSON.stringify([{ id: req.query.product_id }]))
  }
  if (typeof req.query.kind === 'string' && req.query.kind) {
    conditions.push('kind = ?'); params.push(req.query.kind)
  }
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    conditions.push('(payload->>\'products\' ILIKE ? OR payload->>\'sku\' ILIKE ?)')
    params.push('%' + req.query.q.trim() + '%', '%' + req.query.q.trim() + '%')
  }
  const where = conditions.join(' AND ')
  if (req.query.group_by === 'product') {
    const grouped = `WITH matching AS (SELECT * FROM inventory_movement WHERE ${where}),
      products AS (
        SELECT COALESCE(product->>'id', '__unlinked__') AS id,
          (array_agg(COALESCE(product->>'title', 'Unlinked inventory items') ORDER BY created_at DESC))[1] AS title,
          count(DISTINCT matching.id)::int AS movement_count,
          count(DISTINCT COALESCE(product->>'variant_id', inventory_item_id))::int AS variant_count,
          max(created_at) AS latest_at
        FROM matching LEFT JOIN LATERAL jsonb_array_elements(payload->'products') product ON true
        GROUP BY COALESCE(product->>'id', '__unlinked__')
      )`
    const [rows, count] = await Promise.all([
      db.raw(`${grouped} SELECT * FROM products ORDER BY latest_at DESC, id LIMIT ? OFFSET ?`, [...params, limit, offset]),
      db.raw(`${grouped} SELECT count(*)::int AS count FROM products`, params),
    ])
    res.json({ products: rows.rows, count: count.rows[0].count, limit, offset })
    return
  }
  const [rows, count] = await Promise.all([
    db.raw(`SELECT id, inventory_item_id, location_id, kind, payload, created_at FROM inventory_movement WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
    db.raw(`SELECT count(*)::int AS count FROM inventory_movement WHERE ${where}`, params),
  ])
  res.json({ movements: rows.rows, count: count.rows[0].count, limit, offset })
}
