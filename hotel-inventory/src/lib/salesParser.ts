/**
 * Utilities for parsing the FNS Manager sales export file.
 * The .xls file exported from FNS is actually an HTML table saved with .xls extension.
 * The xlsx library (already installed) handles this format.
 */

import * as XLSX from 'xlsx'
import type { LocationType } from '@/types'

export interface SalesRow {
  puntoDeVenta: string    // "CASA SANZ", "HOTEL BIDASOA", or numeric ID
  receta: string          // recipe name as shown in FNS
  cantidad: number        // quantity sold
  grupo: string           // e.g. "Mixología", "Jugos", "Cervezas"
  familia: string         // e.g. "Bebestibles SANZ"
}

export interface ParsedSalesFile {
  rows: SalesRow[]
  filename: string
  /** Date inferred from filename (YYYY-MM-DD format of first date found) */
  inferredDate: string | null
}

/**
 * FNS "Punto de venta" → LocationType mapping
 */
const LOCATION_MAP: Record<string, LocationType> = {
  'CASA SANZ': 'bar_casa_sanz',
  'BAR CASA SANZ': 'bar_casa_sanz',
  'HOTEL BIDASOA': 'bar_hotel_bidasoa',
  'BAR HOTEL BIDASOA': 'bar_hotel_bidasoa',
  'HOTEL': 'bar_hotel_bidasoa',
}

export function mapLocationFromFNS(puntoDeVenta: string): LocationType | null {
  if (!puntoDeVenta) return null
  const upper = puntoDeVenta.toUpperCase().trim()
  return LOCATION_MAP[upper] ?? null
}

/**
 * Infer the report date from the filename.
 * FNS exports filenames like: "Ventas-Recetas 2026-02-23 2026-02-24.xls"
 * Returns the first date found in YYYY-MM-DD format.
 */
export function inferDateFromFilename(filename: string): string | null {
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/)
  return dateMatch ? dateMatch[1] : null
}

/**
 * Parse the FNS sales XLS/HTML file.
 * The file is an HTML table that xlsx can parse.
 *
 * Expected columns (by name):
 *   "Punto de venta", "Receta", "Cantidad", "Grupo", "Familia"
 *
 * Returns all rows with their parsed data.
 */
export async function parseSalesFile(file: File): Promise<ParsedSalesFile> {
  const buffer = await file.arrayBuffer()
  const data = new Uint8Array(buffer)

  // xlsx handles HTML tables saved as .xls
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // Convert to array of objects using first row as headers
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  })

  const rows: SalesRow[] = []

  for (const raw of rawRows) {
    // Normalize column names (different FNS exports may have slight variations)
    const puntoDeVenta = getString(raw, ['Punto de venta', 'Punto De Venta', 'PUNTO DE VENTA'])
    const receta = getString(raw, ['Receta', 'RECETA', 'receta'])
    const cantidadRaw = getString(raw, ['Cantidad', 'CANTIDAD', 'cantidad'])
    const grupo = getString(raw, ['Grupo', 'GRUPO', 'grupo'])
    const familia = getString(raw, ['Familia', 'FAMILIA', 'familia'])

    if (!receta) continue

    const cantidad = parseFloat(cantidadRaw.replace(',', '.')) || 0
    if (cantidad <= 0) continue

    rows.push({
      puntoDeVenta,
      receta,
      cantidad,
      grupo,
      familia,
    })
  }

  return {
    rows,
    filename: file.name,
    inferredDate: inferDateFromFilename(file.name),
  }
}

function getString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return String(obj[key]).trim()
    }
  }
  return ''
}

/**
 * Group sales rows by recipe name, summing quantities.
 * Returns deduplicated entries with total quantities per recipe per location.
 */
export function groupSalesByRecipe(rows: SalesRow[]): {
  receta: string
  cantidad: number
  location: LocationType | null
  puntoDeVenta: string
  grupo: string
}[] {
  const map = new Map<
    string,
    { receta: string; cantidad: number; location: LocationType | null; puntoDeVenta: string; grupo: string }
  >()

  for (const row of rows) {
    const location = mapLocationFromFNS(row.puntoDeVenta)
    const key = `${row.receta}::${row.puntoDeVenta}`
    const existing = map.get(key)
    if (existing) {
      existing.cantidad += row.cantidad
    } else {
      map.set(key, {
        receta: row.receta,
        cantidad: row.cantidad,
        location,
        puntoDeVenta: row.puntoDeVenta,
        grupo: row.grupo,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.receta.localeCompare(b.receta))
}
