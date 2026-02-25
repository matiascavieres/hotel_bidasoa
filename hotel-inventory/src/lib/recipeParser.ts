/**
 * Utilities for parsing the cocktail recipe CSV
 * Format: CSV with columns [empty, Coctel, Medidas, Decoración, Cristaleria]
 * Ingredients are newline-separated within the quoted Medidas cell
 * Quantities can be in oz, ml, or non-liquid (to be skipped)
 */

export interface ParsedIngredientLine {
  raw: string           // original text e.g. "2 ½ oz Gin Beefeater Original"
  quantityOz: number    // parsed quantity in oz (0 if non-oz unit)
  quantityMl: number    // converted to ml (oz × 29.5735)
  unit: string          // 'oz', 'ml', or other
  ingredientName: string // e.g. "Gin Beefeater Original"
  isLiquid: boolean     // true if this ingredient should affect inventory
}

export interface ParsedRecipe {
  name: string
  rawIngredients: ParsedIngredientLine[]
}

const OZ_TO_ML = 29.5735

// Unicode fractions mapping
const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
}

/**
 * Parse a quantity string that may contain unicode fractions or mixed numbers.
 * Examples: "2 ½" → 2.5, "¾" → 0.75, "1½" → 1.5, "2" → 2, "3 a 4" → 3.5 (avg)
 */
export function parseQuantity(text: string): number {
  const trimmed = text.trim()

  // Replace unicode fractions with decimal equivalents
  let normalized = trimmed
  for (const [frac, val] of Object.entries(UNICODE_FRACTIONS)) {
    normalized = normalized.replace(frac, ` ${val}`)
  }

  // Handle range like "3 a 4" → take the lower bound
  const rangeMatch = normalized.match(/^(\d+(?:\.\d+)?)\s+a\s+(\d+(?:\.\d+)?)$/)
  if (rangeMatch) {
    return parseFloat(rangeMatch[1])
  }

  // Handle fraction like "3/4"
  const fractionMatch = normalized.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch) {
    return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2])
  }

  // Handle mixed number like "2 0.5" (after unicode replacement) → 2.5
  const parts = normalized.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 2) {
    const whole = parseFloat(parts[0])
    const fraction = parseFloat(parts[1])
    if (!isNaN(whole) && !isNaN(fraction) && fraction < 1) {
      return whole + fraction
    }
  }

  // Single number
  if (parts.length === 1) {
    const n = parseFloat(parts[0])
    return isNaN(n) ? 0 : n
  }

  return 0
}

/**
 * Parse a single ingredient line from the recipe CSV.
 * Handles formats like:
 *   "2 ½ oz Gin Beefeater Original"
 *   "200 ml Ginger beer"
 *   "1 bola de helado naranja" (non-liquid)
 *   "8 hojas de menta" (non-liquid)
 */
export function parseIngredientLine(line: string): ParsedIngredientLine {
  const raw = line.trim()

  // Match pattern: [number/fraction(s)] [unit] [ingredient name]
  // The unit can be oz, ml, cl, cc
  const ozPattern = /^([\d½¼¾⅓⅔⅛\s/]+)\s+oz\s+(.+)$/i
  const mlPattern = /^([\d½¼¾⅓⅔⅛\s/]+)\s+(?:ml|cc)\s+(.+)$/i

  const ozMatch = raw.match(ozPattern)
  if (ozMatch) {
    const qty = parseQuantity(ozMatch[1])
    const name = ozMatch[2].trim()
    const qtyMl = parseFloat((qty * OZ_TO_ML).toFixed(1))
    return {
      raw,
      quantityOz: qty,
      quantityMl: qtyMl,
      unit: 'oz',
      ingredientName: name,
      isLiquid: qty > 0,
    }
  }

  const mlMatch = raw.match(mlPattern)
  if (mlMatch) {
    const qty = parseQuantity(mlMatch[1])
    const name = mlMatch[2].trim()
    return {
      raw,
      quantityOz: 0,
      quantityMl: qty,
      unit: 'ml',
      ingredientName: name,
      isLiquid: qty > 0,
    }
  }

  // Non-liquid ingredient (decorations, garnishes, etc.)
  // Try to extract the name by removing leading number/fraction
  const nonLiquidMatch = raw.match(/^[\d½¼¾⅓⅔⅛\s/a-z]*\s+(.+)$/i)
  const name = nonLiquidMatch ? nonLiquidMatch[1].trim() : raw

  return {
    raw,
    quantityOz: 0,
    quantityMl: 0,
    unit: 'other',
    ingredientName: name || raw,
    isLiquid: false,
  }
}

/**
 * Parse the complete recipe CSV text.
 * The CSV has structure:
 *   Row 1-3: empty/header rows
 *   Row 4: headers (empty, Coctel, Medidas, Decoración, Cristaleria)
 *   Row 5+: recipe rows (Coctel in col B, Medidas in col C with \n-separated ingredients)
 *   Empty rows between recipes are separators
 *
 * Uses the xlsx library's sheet parsing to handle multi-line cells.
 */
export function parseRecipeCSV(csvText: string): ParsedRecipe[] {
  const recipes: ParsedRecipe[] = []

  // Split into lines while preserving quoted multi-line cells
  const rows = parseCSVRows(csvText)

  for (const row of rows) {
    // Column B (index 1) is Coctel, Column C (index 2) is Medidas
    const coctel = (row[1] || '').trim()
    const medidas = (row[2] || '').trim()

    // Skip rows without a cocktail name
    if (!coctel || coctel.toLowerCase() === 'coctel') continue

    // Parse ingredient lines (separated by newlines within the cell)
    const ingredientLines = medidas
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    const rawIngredients = ingredientLines.map(parseIngredientLine)

    recipes.push({
      name: coctel,
      rawIngredients,
    })
  }

  return recipes
}

/**
 * Simple CSV parser that handles quoted multi-line cells.
 * Returns an array of rows, each row being an array of cell values.
 */
function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = []
  let i = 0
  const len = csvText.length

  while (i < len) {
    const row: string[] = []

    while (i < len && csvText[i] !== '\n') {
      let cell = ''

      if (csvText[i] === '"') {
        // Quoted cell - may contain newlines and commas
        i++ // skip opening quote
        while (i < len) {
          if (csvText[i] === '"') {
            if (csvText[i + 1] === '"') {
              // Escaped quote
              cell += '"'
              i += 2
            } else {
              // End of quoted cell
              i++
              break
            }
          } else {
            cell += csvText[i]
            i++
          }
        }
      } else {
        // Unquoted cell - ends at comma or newline
        while (i < len && csvText[i] !== ',' && csvText[i] !== '\n') {
          cell += csvText[i]
          i++
        }
      }

      row.push(cell.trim())

      // Skip comma separator
      if (i < len && csvText[i] === ',') {
        i++
      }
    }

    // Skip newline
    if (i < len && csvText[i] === '\n') i++
    // Handle \r\n
    if (i > 0 && csvText[i - 2] === '\r') {
      // already handled
    }

    if (row.some((cell) => cell.trim())) {
      rows.push(row)
    }
  }

  return rows
}

/**
 * Extract all unique ingredient names across all recipes.
 * Returns a deduplicated list for the mapping UI.
 */
export function extractUniqueIngredients(recipes: ParsedRecipe[]): {
  name: string
  appearances: number
  exampleQuantityMl: number
  unit: string
  isLiquid: boolean
}[] {
  const map = new Map<
    string,
    { appearances: number; totalMl: number; unit: string; isLiquid: boolean }
  >()

  for (const recipe of recipes) {
    for (const ing of recipe.rawIngredients) {
      const key = ing.ingredientName.toLowerCase().trim()
      const existing = map.get(key)
      if (existing) {
        existing.appearances++
        existing.totalMl += ing.quantityMl
      } else {
        map.set(key, {
          appearances: 1,
          totalMl: ing.quantityMl,
          unit: ing.unit,
          isLiquid: ing.isLiquid,
        })
      }
    }
  }

  return Array.from(map.entries())
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      appearances: data.appearances,
      exampleQuantityMl: parseFloat((data.totalMl / data.appearances).toFixed(1)),
      unit: data.unit,
      isLiquid: data.isLiquid,
    }))
    .sort((a, b) => b.appearances - a.appearances)
}
