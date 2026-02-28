import type { SalesData } from '@/types'

/**
 * Normalize a recipe name by stripping location suffixes.
 * Patterns handled (case-insensitive):
 *   - "*CS*", "*Cs*", "*BI*", "*Bi*" etc. (asterisk-wrapped)
 *   - "(cs)", "(bi)" (parenthesized)
 *   - Trailing " CS" or " BI" at end of string
 *   - Trailing "°"
 * Also trims whitespace and collapses multiple spaces.
 */
export function normalizeRecetaName(receta: string): string {
  return receta
    .replace(/\s*\*[CcBb][SsIi]\*\s*/g, '') // *CS*, *Cs*, *BI*, etc.
    .replace(/\s*\([CcBb][SsIi]\)\s*/g, '')  // (cs), (bi), etc.
    .replace(/\s+[CcBb][SsIi]\s*$/g, '')     // trailing " CS", " BI", " Cs"
    .replace(/\s*°\s*$/g, '')                 // trailing °
    .replace(/\s+/g, ' ')                     // collapse multi-space
    .trim()
}

/**
 * Deduplicate sales data by normalized recipe name.
 * Sums quantities across duplicates, keeps first grupo/familia.
 */
export function deduplicateSalesData(data: SalesData[]): SalesData[] {
  const map = new Map<string, SalesData>()

  for (const item of data) {
    const key = normalizeRecetaName(item.receta).toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.cantidad_2024 += item.cantidad_2024
      existing.cantidad_2025 += item.cantidad_2025
      existing.total += item.total
      existing.daily_avg += item.daily_avg
      existing.importe_total += item.importe_total
      // Recalculate importe_unitario as weighted average
      if (existing.total > 0) {
        existing.importe_unitario = Math.round(existing.importe_total / existing.total)
      }
    } else {
      map.set(key, {
        ...item,
        receta: normalizeRecetaName(item.receta),
      })
    }
  }

  return Array.from(map.values())
}
