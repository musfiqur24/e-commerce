type Level = { stocked_quantity: number; reserved_quantity: number }
type Variant = {
  id: string
  title: string
  manage_inventory?: boolean
  inventory_items?: Array<{ required_quantity?: number; inventory?: { location_levels?: Level[] } }>
}

export function summarizeProductInventory(variants: Variant[]) {
  const breakdown = variants.map(variant => {
    if (variant.manage_inventory === false) {
      return { id: variant.id, title: variant.title, available: null }
    }
    const components = variant.inventory_items ?? []
    const available = components.length
      ? Math.min(
          ...components.map(component => {
            const required = Number(component.required_quantity ?? 1)
            if (!(required > 0)) return 0
            const stock = (component.inventory?.location_levels ?? []).reduce(
              (total, level) =>
                total + Math.max(0, Number(level.stocked_quantity) - Number(level.reserved_quantity)),
              0
            )
            return Math.floor(stock / required)
          })
        )
      : 0

    return {
      id: variant.id,
      title: variant.title,
      available,
    }
  })

  return {
    total: breakdown.reduce((total, variant) => total + (variant.available ?? 0), 0),
    untracked: breakdown.filter(variant => variant.available === null).length,
    variants: breakdown,
  }
}
