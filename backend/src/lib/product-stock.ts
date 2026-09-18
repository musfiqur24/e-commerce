import { z } from 'zod'

export const initialStockSchema = z.object({
  location_id: z.string().min(1, 'Select a warehouse').optional(),
  quantities: z.array(z.object({
    options: z.record(z.string(), z.string()),
    quantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    location_id: z.string().min(1).optional(),
    variant_rank: z.number().int().min(0).optional(),
  })).min(1),
}).nullable().optional()

export type InitialStock = NonNullable<z.infer<typeof initialStockSchema>>
export const stockOptionKey = (options: Record<string, string>) =>
  JSON.stringify(Object.entries(options).sort(([a], [b]) => a.localeCompare(b)))
