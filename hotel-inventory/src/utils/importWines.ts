import * as XLSX from 'xlsx'
import type { Category } from '@/types'

export interface WineImportRow {
  code: string
  name: string
  categoryId: string
  categoryName: string
  formatMl: number
  salePrice: number
}

export interface WineImportResult {
  products: WineImportRow[]
  warnings: string[]
}

/**
 * Detect bottle format from product name.
 * Default is 750ml. Detects 1.5L and 375ml variants.
 */
function detectFormatMl(name: string): number {
  // 1.5 liters / 1,5 litros patterns
  if (/1[.,]5\s*(l|lt|litro)/i.test(name)) return 1500
  // 375ml
  if (/375\s*(ml)?/i.test(name)) return 375
  return 750
}

/**
 * Normalize a column key: strip BOM, lowercase, trim, remove accents
 */
function normalizeKey(key: string): string {
  return key
    .replace(/^\uFEFF/, '') // strip BOM
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
}

/**
 * Get a value from a row by trying multiple key variations
 */
function getRowValue(row: Record<string, unknown>, ...keys: string[]): unknown {
  // First try exact keys
  for (const key of keys) {
    if (row[key] !== undefined) return row[key]
  }
  // Then try normalized matching against all row keys
  const normalizedTargets = keys.map(k => normalizeKey(k))
  for (const rowKey of Object.keys(row)) {
    const normalizedRowKey = normalizeKey(rowKey)
    if (normalizedTargets.includes(normalizedRowKey)) {
      return row[rowKey]
    }
  }
  return undefined
}

/**
 * Parse a wine CSV file and map rows to product data.
 * Expected CSV columns: nombre, cepa, valor_venta_bruto
 */
export function parseWineCSV(
  fileData: ArrayBuffer,
  categories: Category[]
): WineImportResult {
  const workbook = XLSX.read(fileData, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  const warnings: string[] = []
  const products: WineImportRow[] = []

  if (rows.length === 0) {
    warnings.push('El archivo no contiene filas de datos')
    return { products, warnings }
  }

  // Debug: show detected columns
  const firstRowKeys = Object.keys(rows[0])
  warnings.push(`Columnas detectadas: ${firstRowKeys.join(', ')}`)

  // Build category lookup (case-insensitive, trimmed, accent-insensitive)
  const categoryMap = new Map<string, { id: string; name: string }>()
  for (const cat of categories) {
    categoryMap.set(normalizeKey(cat.name), { id: cat.id, name: cat.name })
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2 // header is row 1
    const nombre = String(getRowValue(row, 'nombre', 'Nombre', 'NOMBRE') ?? '').trim()
    const cepa = String(getRowValue(row, 'cepa', 'Cepa', 'CEPA') ?? '').trim()
    const precioRaw = getRowValue(row, 'valor_venta_bruto', 'Valor_venta_bruto', 'VALOR_VENTA_BRUTO', 'precio', 'Precio')

    if (!nombre) {
      warnings.push(`Fila ${rowNum}: nombre vacío, omitida`)
      return
    }

    // Find category by cepa name (accent-insensitive)
    const normalizedCepa = normalizeKey(cepa)
    const categoryMatch = categoryMap.get(normalizedCepa)
    if (!categoryMatch) {
      warnings.push(`Fila ${rowNum}: cepa "${cepa}" no encontrada en categorías, omitida`)
      return
    }

    // Parse price - handle both "24900" and "24.900" formats
    let salePrice = 0
    const priceStr = String(precioRaw ?? '').replace(/[.\s]/g, '').replace(',', '.')
    salePrice = Math.round(Number(priceStr))
    if (isNaN(salePrice) || salePrice <= 0) {
      warnings.push(`Fila ${rowNum}: precio inválido "${precioRaw}", usando 0`)
      salePrice = 0
    }

    const formatMl = detectFormatMl(nombre)

    // Code will be assigned sequentially after all rows are parsed
    products.push({
      code: '', // placeholder
      name: nombre,
      categoryId: categoryMatch.id,
      categoryName: categoryMatch.name,
      formatMl,
      salePrice,
    })
  })

  // Assign sequential codes: VINO-001, VINO-002, ...
  products.forEach((p, i) => {
    p.code = `VINO-${String(i + 1).padStart(3, '0')}`
  })

  // Remove the debug column warning if parsing was successful
  if (products.length > 0) {
    warnings.shift() // remove "Columnas detectadas" message
  }

  return { products, warnings }
}
