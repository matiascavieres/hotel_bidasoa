/**
 * Parser para el archivo XLSX de recetas de Casa Sanz.
 * Formato: cada hoja del Excel es una receta.
 * Columnas: INGREDIENTES (col A), CODIGO (col B), GR (col C), PRECIO x KILO (col D), etc.
 */
import * as XLSX from 'xlsx'

export interface CasaSanzIngredient {
  name: string
  quantity_gr: number    // cantidad en gramos (columna GR)
  price_per_kg: number   // precio por kilo (columna PRECIO x KILO)
}

export interface CasaSanzRecipe {
  name: string           // nombre de la hoja (ej: "TACOS DEL FUTURO")
  ingredients: CasaSanzIngredient[]
}

// Hojas que NO son recetas (resúmenes, consolidados, etc.)
const NON_RECIPE_SHEETS = ['consolidado', 'resumen', 'resumen general', 'portada', 'cover']

function isNonRecipeSheet(name: string): boolean {
  return NON_RECIPE_SHEETS.some((s) => name.toLowerCase().includes(s))
}

/**
 * Detecta si una fila es la cabecera de la tabla de ingredientes.
 * Busca una fila que contenga 'INGREDIENTES' o al menos 'GR' y 'PRECIO'.
 */
function isHeaderRow(row: unknown[]): boolean {
  const cells = row.map((c) => String(c ?? '').toUpperCase().trim())
  const hasIngredientes = cells.some((c) => c.includes('INGREDIENTES'))
  const hasGr = cells.some((c) => c === 'GR' || c === 'GRS')
  const hasPrecio = cells.some((c) => c.includes('PRECIO'))
  return hasIngredientes || (hasGr && hasPrecio)
}

/**
 * Detecta si una fila debe ser ignorada (separadores, totales, receta descripción, etc.).
 */
function isSkipRow(name: string): boolean {
  const upper = name.toUpperCase().trim()
  return (
    upper.startsWith('RECETA') ||
    upper.startsWith('TOTAL') ||
    upper.startsWith('COSTO') ||
    upper === '' ||
    upper === 'INGREDIENTES'
  )
}

/**
 * Parsea el archivo XLSX de Casa Sanz y retorna las recetas detectadas.
 */
export async function parseCasaSanzXlsx(file: File): Promise<CasaSanzRecipe[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  const recipes: CasaSanzRecipe[] = []

  for (const sheetName of workbook.SheetNames) {
    if (isNonRecipeSheet(sheetName)) continue

    const ws = workbook.Sheets[sheetName]
    // Convertir a array de arrays, rellenando celdas vacías con ''
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })

    // Encontrar la fila de cabecera (INGREDIENTES / GR / PRECIO x KILO)
    let headerRowIdx = -1
    for (let i = 0; i < rows.length; i++) {
      if (isHeaderRow(rows[i])) {
        headerRowIdx = i
        break
      }
    }

    if (headerRowIdx === -1) continue

    // Determinar índices de columnas a partir de la fila de cabecera
    const headerRow = rows[headerRowIdx].map((c) => String(c ?? '').toUpperCase().trim())

    // Columna INGREDIENTES: buscar índice que contenga 'INGREDIENTES' o primera columna no vacía
    let colIngrediente = headerRow.findIndex((c) => c.includes('INGREDIENTES'))
    if (colIngrediente === -1) colIngrediente = 0

    // Columna GR
    let colGr = headerRow.findIndex((c) => c === 'GR' || c === 'GRS')
    if (colGr === -1) colGr = colIngrediente + 2

    // Columna PRECIO x KILO
    let colPrecio = headerRow.findIndex((c) => c.includes('PRECIO') && c.includes('KILO'))
    if (colPrecio === -1) colPrecio = headerRow.findIndex((c) => c.includes('PRECIO'))
    if (colPrecio === -1) colPrecio = colIngrediente + 3

    const ingredients: CasaSanzIngredient[] = []

    // Iterar filas debajo del header
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      const rawName = String(row[colIngrediente] ?? '').trim()

      if (!rawName || isSkipRow(rawName)) continue

      const rawGr = row[colGr]
      const rawPrecio = row[colPrecio]

      const quantity_gr = typeof rawGr === 'number' ? rawGr : parseFloat(String(rawGr).replace(',', '.'))
      const price_per_kg = typeof rawPrecio === 'number' ? rawPrecio : parseFloat(String(rawPrecio).replace(',', '.'))

      // Solo incluir si tiene cantidad y precio válidos
      if (!isNaN(quantity_gr) && quantity_gr > 0 && !isNaN(price_per_kg) && price_per_kg > 0) {
        ingredients.push({
          name: rawName,
          quantity_gr,
          price_per_kg,
        })
      }
    }

    if (ingredients.length > 0) {
      recipes.push({
        name: sheetName,
        ingredients,
      })
    }
  }

  return recipes
}

/**
 * Extrae los ingredientes únicos de todas las recetas (para el paso de mapeo).
 */
export function extractUniqueCasaSanzIngredients(recipes: CasaSanzRecipe[]): {
  name: string
  appearances: number
  exampleQuantityGr: number
  examplePricePerKg: number
}[] {
  const map = new Map<string, { appearances: number; totalGr: number; totalPrice: number }>()

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = ing.name.toLowerCase().trim()
      const existing = map.get(key)
      if (existing) {
        existing.appearances++
        existing.totalGr += ing.quantity_gr
        existing.totalPrice += ing.price_per_kg
      } else {
        map.set(key, { appearances: 1, totalGr: ing.quantity_gr, totalPrice: ing.price_per_kg })
      }
    }
  }

  return Array.from(map.entries())
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      appearances: data.appearances,
      exampleQuantityGr: Math.round(data.totalGr / data.appearances),
      examplePricePerKg: Math.round(data.totalPrice / data.appearances),
    }))
    .sort((a, b) => b.appearances - a.appearances)
}
