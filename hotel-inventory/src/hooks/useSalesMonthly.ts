import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SalesMonthly } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns {year, month} from a 'YYYY-MM' string */
function parseYearMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return { year: y, month: m }
}

/** Compute the last day of a given year+month */
function lastDayOf(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Returns the previous calendar month as 'YYYY-MM' */
export function getPreviousMonth(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Convert 'YYYY-MM' to first day string 'YYYY-MM-01' */
export function monthToFirstDay(ym: string): string {
  return `${ym}-01`
}

/** Convert 'YYYY-MM' to last day string 'YYYY-MM-DD' */
export function monthToLastDay(ym: string): string {
  const { year, month } = parseYearMonth(ym)
  const last = lastDayOf(year, month)
  return `${ym}-${String(last).padStart(2, '0')}`
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UseSalesMonthlyOptions {
  /** 'YYYY-MM' – start of range (inclusive) */
  fromMonth: string
  /** 'YYYY-MM' – end of range (inclusive) */
  toMonth: string
  /** Substring filter on the 'familia' column (e.g. 'Alimentación', 'Bebestibles Bar') */
  familiaFilter?: string
  /** Exact grupo filter */
  grupos?: string[]
  searchQuery?: string
}

// Aggregated view per recipe across the date range
export interface SalesMonthlyAgg extends Omit<SalesMonthly, 'year' | 'month' | 'updated_at'> {
  /** IDs of all individual records that make up this aggregation */
  rowIds: string[]
  /** true when only one record exists (single-month or single record) – editing is enabled */
  isSingleRecord: boolean
}

// ── Main query hook ────────────────────────────────────────────────────────────

export function useSalesMonthly(options: UseSalesMonthlyOptions) {
  const { fromMonth, toMonth, familiaFilter, grupos, searchQuery } = options
  const { year: fromYear, month: fromMonthNum } = parseYearMonth(fromMonth)
  const { year: toYear,   month: toMonthNum   } = parseYearMonth(toMonth)

  return useQuery({
    queryKey: ['sales_monthly', fromMonth, toMonth, familiaFilter, grupos, searchQuery],
    queryFn: async () => {
      let q = supabase
        .from('sales_monthly')
        .select('*')
        .order('importe_total', { ascending: false })

      // Year / month range
      if (fromYear === toYear) {
        q = q
          .eq('year', fromYear)
          .gte('month', fromMonthNum)
          .lte('month', toMonthNum)
      } else {
        // Cross-year: fetch years in range, filter months client-side
        q = q.gte('year', fromYear).lte('year', toYear)
      }

      if (familiaFilter) {
        q = q.ilike('familia', `%${familiaFilter}%`)
      }

      if (grupos && grupos.length > 0) {
        q = q.in('grupo', grupos)
      }

      if (searchQuery) {
        q = q.ilike('receta', `%${searchQuery}%`)
      }

      const { data, error } = await q
      if (error) throw error

      const rows = data as SalesMonthly[]

      // Cross-year client-side month filter
      const filtered = (fromYear !== toYear)
        ? rows.filter(r => {
            const s = r.year * 12 + r.month
            return s >= fromYear * 12 + fromMonthNum && s <= toYear * 12 + toMonthNum
          })
        : rows

      // Aggregate by receta (sum quantities & importe across months)
      const map = new Map<string, SalesMonthlyAgg>()
      for (const row of filtered) {
        const key = row.receta.toLowerCase()
        const existing = map.get(key)
        if (existing) {
          existing.cantidad      += row.cantidad
          existing.importe_total += row.importe_total
          existing.rowIds.push(row.id)
          existing.isSingleRecord = false
          // Keep first importe_unitario (or most recent – here we keep first)
        } else {
          map.set(key, {
            id:               row.id,
            receta:           row.receta,
            grupo:            row.grupo,
            familia:          row.familia,
            cantidad:         row.cantidad,
            importe_unitario: row.importe_unitario,
            importe_total:    row.importe_total,
            created_at:       row.created_at,
            rowIds:           [row.id],
            isSingleRecord:   true,
          })
        }
      }

      return Array.from(map.values()).sort((a, b) => b.importe_total - a.importe_total)
    },
  })
}

// ── Groups list ────────────────────────────────────────────────────────────────

export function useSalesMonthlyGrupos(fromMonth: string, toMonth: string) {
  const { year: fromYear, month: fromMonthNum } = parseYearMonth(fromMonth)
  const { year: toYear,   month: toMonthNum   } = parseYearMonth(toMonth)

  return useQuery({
    queryKey: ['sales_monthly_grupos', fromMonth, toMonth],
    queryFn: async () => {
      let q = supabase.from('sales_monthly').select('grupo')

      if (fromYear === toYear) {
        q = q.eq('year', fromYear).gte('month', fromMonthNum).lte('month', toMonthNum)
      } else {
        q = q.gte('year', fromYear).lte('year', toYear)
      }

      const { data, error } = await q
      if (error) throw error

      return [...new Set(data.map((d: { grupo: string }) => d.grupo))].sort() as string[]
    },
  })
}

// ── Grupo lists for Bar vs Vinos split ────────────────────────────────────────

export const BAR_GRUPOS = [
  'Aperitivos', 'Bajativos', 'Bebidas', 'Bourbon', 'Cafetería',
  'Cervezas', 'Gin', 'Jugos', 'Mezcal', 'Mixología', 'Mocktails',
  'Pisco', 'Ron', 'Tequila', 'Vodka', 'Whisky',
]

export const VINOS_GRUPOS = [
  'Blend', 'Burbujas', 'Cabernet Sauvignon', 'Carmenere', 'Catas',
  'Chardonnay', 'Icono de la Semana', 'Iconos', 'Otros Tintos',
  'Pinot Noir', 'Por Copas', 'Rose', 'Sauvignon Blanc',
]

const BAR_GRUPOS_SET   = new Set(BAR_GRUPOS.map(g => g.toLowerCase()))
const VINOS_GRUPOS_SET = new Set(VINOS_GRUPOS.map(g => g.toLowerCase()))

// ── Familia totals (for KPI breakdown) ────────────────────────────────────────

export interface FamiliaTotals {
  total:       number
  cocina:      number
  bar:         number
  vinos:       number
  totalUnits:  number
}

export function useSalesMonthlyTotals(fromMonth: string, toMonth: string): {
  data: FamiliaTotals | undefined
  isLoading: boolean
} {
  const { year: fromYear, month: fromMonthNum } = parseYearMonth(fromMonth)
  const { year: toYear,   month: toMonthNum   } = parseYearMonth(toMonth)

  const { data, isLoading } = useQuery({
    queryKey: ['sales_monthly_totals', fromMonth, toMonth],
    queryFn: async () => {
      let q = supabase
        .from('sales_monthly')
        .select('familia, grupo, importe_total, cantidad')

      if (fromYear === toYear) {
        q = q.eq('year', fromYear).gte('month', fromMonthNum).lte('month', toMonthNum)
      } else {
        q = q.gte('year', fromYear).lte('year', toYear)
      }

      const { data, error } = await q
      if (error) throw error

      const rows = data as { familia: string; grupo: string; importe_total: number; cantidad: number }[]

      const totals: FamiliaTotals = { total: 0, cocina: 0, bar: 0, vinos: 0, totalUnits: 0 }
      for (const r of rows) {
        totals.total      += r.importe_total
        totals.totalUnits += r.cantidad
        const f = r.familia.toLowerCase()
        const g = (r.grupo || '').toLowerCase()
        if (f.includes('alimentaci')) {
          totals.cocina += r.importe_total
        } else if (f.includes('bebestibles')) {
          if (BAR_GRUPOS_SET.has(g))   totals.bar   += r.importe_total
          else if (VINOS_GRUPOS_SET.has(g)) totals.vinos += r.importe_total
        }
      }

      return totals
    },
  })

  return { data, isLoading }
}

// ── Update a single record ────────────────────────────────────────────────────

export function useUpdateSalesMonthly() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      cantidad,
      importe_unitario,
    }: {
      id: string
      cantidad: number
      importe_unitario: number
    }) => {
      const importe_total = cantidad * importe_unitario

      const { data, error } = await supabase
        .from('sales_monthly')
        .update({ cantidad, importe_unitario, importe_total })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales_monthly'] })
      qc.invalidateQueries({ queryKey: ['sales_monthly_totals'] })
    },
  })
}

// ── Upsert a monthly record (used from the import flow) ───────────────────────

export async function upsertSalesMonthlyRecord(record: {
  receta: string
  grupo: string
  familia: string
  year: number
  month: number
  cantidad: number
  importe_unitario: number
}) {
  const importe_total = record.cantidad * record.importe_unitario

  const { error } = await supabase
    .from('sales_monthly')
    .upsert(
      { ...record, importe_total },
      { onConflict: 'year,month,receta', ignoreDuplicates: false }
    )

  if (error) throw error
}
