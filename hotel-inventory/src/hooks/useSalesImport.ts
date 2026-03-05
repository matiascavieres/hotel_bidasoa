import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Recipe, SalesImport } from '@/types'
import type { LocationType } from '@/types'
import { upsertSalesMonthlyRecord } from '@/hooks/useSalesMonthly'

export interface SalesDeductionItem {
  recetaFNS: string          // Recipe name from the FNS file
  cantidad: number           // Quantity sold
  location: LocationType     // Which bar to deduct from
  matchedRecipe: Recipe      // The matched system recipe
  deductions: {
    product_id: string
    product_name: string
    product_code: string
    quantity_ml: number      // Total ml to deduct (ingredient_ml × cantidad)
  }[]
}

export interface SalesImportPreview {
  matched: SalesDeductionItem[]
  unmatched: {
    recetaFNS: string
    cantidad: number
    location: LocationType | null
    puntoDeVenta: string
  }[]
  stockChanges: {
    product_id: string
    product_name: string
    product_code: string
    location: LocationType
    totalMlToDeduct: number
  }[]
}

export function useSalesImports() {
  return useQuery({
    queryKey: ['sales_imports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_imports')
        .select(`
          *,
          importer:users!imported_by(id, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as unknown as SalesImport[]
    },
  })
}

/**
 * Match FNS sales rows against system recipes and compute stock deductions.
 * This is a pure computation function (not a Supabase query), called client-side.
 */
export function matchSalesWithRecipes(
  salesRows: {
    receta: string
    cantidad: number
    location: LocationType | null
    puntoDeVenta: string
    grupo: string
  }[],
  systemRecipes: Recipe[]
): SalesImportPreview {
  const matched: SalesDeductionItem[] = []
  const unmatched: SalesImportPreview['unmatched'] = []

  // Build a lookup map: recipe name (lowercase) → Recipe
  const recipeMap = new Map<string, Recipe>()
  for (const recipe of systemRecipes) {
    recipeMap.set(recipe.name.toLowerCase().trim(), recipe)
  }

  for (const row of salesRows) {
    // Skip rows without a valid location
    if (!row.location) {
      unmatched.push({
        recetaFNS: row.receta,
        cantidad: row.cantidad,
        location: null,
        puntoDeVenta: row.puntoDeVenta,
      })
      continue
    }

    // Try exact match (case-insensitive)
    const matchedRecipe = recipeMap.get(row.receta.toLowerCase().trim())

    if (!matchedRecipe || !matchedRecipe.ingredients?.length) {
      unmatched.push({
        recetaFNS: row.receta,
        cantidad: row.cantidad,
        location: row.location,
        puntoDeVenta: row.puntoDeVenta,
      })
      continue
    }

    // Calculate deductions: ingredient_ml × quantity_sold
    const deductions = matchedRecipe.ingredients.map((ing) => ({
      product_id: ing.product_id,
      product_name: ing.product?.name || 'Producto',
      product_code: ing.product?.code || '',
      quantity_ml: parseFloat((ing.quantity_ml * row.cantidad).toFixed(2)),
    }))

    matched.push({
      recetaFNS: row.receta,
      cantidad: row.cantidad,
      location: row.location,
      matchedRecipe,
      deductions,
    })
  }

  // Aggregate stock changes by (product_id, location)
  const stockMap = new Map<
    string,
    {
      product_id: string
      product_name: string
      product_code: string
      location: LocationType
      totalMlToDeduct: number
    }
  >()

  for (const item of matched) {
    for (const ded of item.deductions) {
      const key = `${ded.product_id}::${item.location}`
      const existing = stockMap.get(key)
      if (existing) {
        existing.totalMlToDeduct = parseFloat(
          (existing.totalMlToDeduct + ded.quantity_ml).toFixed(2)
        )
      } else {
        stockMap.set(key, {
          product_id: ded.product_id,
          product_name: ded.product_name,
          product_code: ded.product_code,
          location: item.location,
          totalMlToDeduct: ded.quantity_ml,
        })
      }
    }
  }

  return {
    matched,
    unmatched,
    stockChanges: Array.from(stockMap.values()).sort((a, b) =>
      a.product_name.localeCompare(b.product_name)
    ),
  }
}

/**
 * Execute the sales import: deduct stock and save the import record.
 */
export function useProcessSalesImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      preview,
      filename,
      importDate,
      importedBy,
      totalRows,
      salesRows,
    }: {
      preview: SalesImportPreview
      filename: string
      importDate: string
      importedBy: string
      totalRows: number
      /** Original parsed sales rows (receta, grupo, familia, cantidad) from the FNS file */
      salesRows?: {
        receta: string
        cantidad: number
        grupo: string
        familia: string
      }[]
    }) => {
      const { matched, unmatched, stockChanges } = preview

      // 1. Deduct stock for each product-location combination
      for (const change of stockChanges) {
        // Get current inventory
        const { data: current } = await supabase
          .from('inventory')
          .select('id, quantity_ml')
          .eq('product_id', change.product_id)
          .eq('location', change.location)
          .single()

        if (current) {
          const newQty = Math.max(0, current.quantity_ml - change.totalMlToDeduct)
          await supabase
            .from('inventory')
            .update({ quantity_ml: newQty })
            .eq('id', current.id)
        }
        // If no inventory record exists, skip (can't deduct from nothing)
      }

      // 2. Create sales_imports record
      const { data: importRecord, error: importError } = await supabase
        .from('sales_imports')
        .insert({
          imported_by: importedBy,
          filename,
          import_date: importDate,
          total_rows: totalRows,
          matched_recipes: matched.length,
          unmatched_recipes: unmatched.length,
          details: {
            matched: matched.map((m) => ({
              recetaFNS: m.recetaFNS,
              recetaSistema: m.matchedRecipe.name,
              cantidad: m.cantidad,
              location: m.location,
            })),
            unmatched: unmatched.map((u) => ({
              recetaFNS: u.recetaFNS,
              puntoDeVenta: u.puntoDeVenta,
              cantidad: u.cantidad,
            })),
            stockChanges,
          },
        })
        .select()
        .single()

      if (importError) throw importError

      // 3. Populate sales_monthly for analytics
      if (salesRows && salesRows.length > 0 && importDate) {
        const d = new Date(importDate)
        const year  = d.getFullYear()
        const month = d.getMonth() + 1

        // Look up importe_unitario from sales_data by recipe name
        const { data: priceData } = await supabase
          .from('sales_data')
          .select('receta, importe_unitario')

        const priceMap = new Map<string, number>()
        if (priceData) {
          for (const p of priceData as { receta: string; importe_unitario: number }[]) {
            priceMap.set(p.receta.toLowerCase().trim(), p.importe_unitario)
          }
        }

        // Aggregate salesRows by receta (some recipes may appear multiple times)
        const recetaMap = new Map<string, { receta: string; grupo: string; familia: string; cantidad: number }>()
        for (const row of salesRows) {
          const key = row.receta.toLowerCase().trim()
          const existing = recetaMap.get(key)
          if (existing) {
            existing.cantidad += row.cantidad
          } else {
            recetaMap.set(key, { receta: row.receta, grupo: row.grupo, familia: row.familia, cantidad: row.cantidad })
          }
        }

        for (const row of recetaMap.values()) {
          const importeUnitario = priceMap.get(row.receta.toLowerCase().trim()) ?? 0
          try {
            await upsertSalesMonthlyRecord({
              receta:           row.receta,
              grupo:            row.grupo,
              familia:          row.familia,
              year,
              month,
              cantidad:         Math.round(row.cantidad),
              importe_unitario: importeUnitario,
            })
          } catch {
            // Non-critical – continue even if individual upsert fails
          }
        }
      }

      // 4. Create audit log
      await supabase.from('audit_logs').insert({
        user_id: importedBy,
        action: 'sales_import',
        entity_type: 'sales_import',
        entity_id: importRecord.id,
        location: null,
        details: {
          filename,
          import_date: importDate,
          matched_recipes: matched.length,
          unmatched_recipes: unmatched.length,
          total_stock_changes: stockChanges.length,
        },
      })

      return importRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_imports'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
