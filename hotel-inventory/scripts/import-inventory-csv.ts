/**
 * One-time script to import inventory items from CSV into Bar Casa Sanz.
 *
 * Usage:  npx tsx scripts/import-inventory-csv.ts
 *
 * - Checks if each product already exists (by barcode or normalized name)
 * - Creates new products when missing
 * - Upserts inventory records at bar_casa_sanz with quantity in ML
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ── Supabase client ──────────────────────────────────────────────────────────
const supabaseUrl = 'https://uoojckrqfaeatdqokjln.supabase.co'
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvb2pja3JxZmFlYXRkcW9ramxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzI1NjksImV4cCI6MjA4NTAwODU2OX0.hzV30KYg17OXtrQseRlFkfSZahx5aHvwwjRAr3k9vKc'

const supabase = createClient(supabaseUrl, supabaseKey)

const TARGET_LOCATION = 'bar_casa_sanz'

// ── Category mapping (CSV lowercase → DB name) ──────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  bebida: 'Bebidas',
  cerveza: 'Cervezas',
  gin: 'Gin',
  whiskey: 'Whisky',
  pisco: 'Pisco',
  licores: 'Licores',
  espumante: 'Espumantes',
  champagne: 'Espumantes',
  prosecco: 'Espumantes',
  riesling: 'Blancos Distintos',
  rose: 'Rosé',
  'sauvignon blanc': 'Sauvignon Blanc',
  chardonnay: 'Chardonnay',
  'pinot noir': 'Pinot Noir',
  muscat: 'Blancos Distintos',
  carmenere: 'Carmenere',
  syrah: 'Syrah',
  cinsault: 'Tintos Distintos',
  pais: 'Tintos Distintos',
  tinto: 'Tintos Distintos',
  'petite syrah': 'Tintos Distintos',
  malbec: 'Malbec',
  merlot: 'Merlot',
  'cabernet sauvignon': 'Cabernet Sauvignon',
  blend: 'Blend',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Detect format_ml from product name + category */
function detectFormatMl(name: string, category: string): number {
  const lower = name.toLowerCase()
  if (/350\s*(ml)?/.test(lower)) return 350
  if (/500\s*(ml)?/.test(lower)) return 500
  if (/750\s*(ml)?/.test(lower)) return 750
  if (/1000\s*(ml)?/.test(lower) || /1\s*lt/.test(lower)) return 1000

  const catLower = category.toLowerCase()
  if (catLower === 'bebida' || catLower === 'bebidas') return 350
  if (catLower === 'cerveza' || catLower === 'cervezas') return 330
  return 750
}

/** Parse the specific CSV format: Nombre,Categoria,Codigo,Cantidad */
function parseCsv(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim())
  const dataLines = lines.slice(1) // skip header

  return dataLines.map((line, idx) => {
    const parts: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    parts.push(current.trim())

    const [nombre, categoria, codigo, cantidad] = parts

    return {
      rowNum: idx + 2,
      name: (nombre || '').trim(),
      category: (categoria || '').trim(),
      code: (codigo || '').trim(),
      quantity: parseFloat((cantidad || '0').replace(',', '.')) || 0,
    }
  }).filter(r => r.name)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.resolve(
    'C:/Users/matca/Downloads/Items por ingresar inventario 02-03.csv'
  )

  console.log('=== Importacion de Inventario a Bar Casa Sanz ===\n')

  // 1) Read CSV
  const rows = parseCsv(csvPath)
  console.log(`CSV: ${rows.length} items leidos\n`)

  // 2) Fetch categories from DB
  const { data: dbCategories, error: catErr } = await supabase
    .from('categories')
    .select('id, name')

  if (catErr || !dbCategories) {
    console.error('Error al obtener categorias:', catErr?.message)
    return
  }

  const categoryIdByName = new Map<string, string>()
  for (const cat of dbCategories) {
    categoryIdByName.set(normalize(cat.name), cat.id)
  }
  console.log(`BD: ${dbCategories.length} categorias cargadas`)

  // 3) Fetch existing products from DB
  const { data: dbProducts, error: prodErr } = await supabase
    .from('products')
    .select('id, code, name, format_ml')
    .eq('is_active', true)

  if (prodErr || !dbProducts) {
    console.error('Error al obtener productos:', prodErr?.message)
    return
  }

  // Build lookup maps
  const productByCode = new Map<string, { id: string; format_ml: number }>()
  const productByName = new Map<string, { id: string; format_ml: number; code: string }>()
  let maxInvCode = 0

  for (const p of dbProducts) {
    productByCode.set(p.code, { id: p.id, format_ml: p.format_ml || 750 })
    productByName.set(normalize(p.name), {
      id: p.id,
      format_ml: p.format_ml || 750,
      code: p.code,
    })
    const match = p.code.match(/^INV-(\d+)$/)
    if (match) {
      maxInvCode = Math.max(maxInvCode, parseInt(match[1], 10))
    }
  }

  console.log(`BD: ${dbProducts.length} productos cargados`)
  console.log(`Ultimo codigo INV existente: INV-${String(maxInvCode).padStart(3, '0')}\n`)

  // 4) Process each row
  let created = 0
  let existing = 0
  let errors = 0
  let invCodeCounter = maxInvCode

  const inventoryUpserts: Array<{
    product_id: string
    location: string
    quantity_ml: number
  }> = []

  for (const row of rows) {
    // a) Map category
    const csvCatNorm = normalize(row.category)
    const dbCatName = CATEGORY_MAP[csvCatNorm]
    if (!dbCatName) {
      console.error(`  [ERROR] Fila ${row.rowNum}: categoria "${row.category}" sin mapeo`)
      errors++
      continue
    }

    const categoryId = categoryIdByName.get(normalize(dbCatName))
    if (!categoryId) {
      console.error(
        `  [ERROR] Fila ${row.rowNum}: categoria mapeada "${dbCatName}" no existe en BD`
      )
      errors++
      continue
    }

    // b) Check if product exists
    const isSinCodigo =
      !row.code || row.code.toLowerCase() === 'sin codigo'

    let productId: string | null = null
    let formatMl: number = detectFormatMl(row.name, row.category)

    if (!isSinCodigo) {
      // Try by barcode code
      const byCode = productByCode.get(row.code)
      if (byCode) {
        productId = byCode.id
        formatMl = byCode.format_ml
      }
    }

    if (!productId) {
      // Try by normalized name
      const byName = productByName.get(normalize(row.name))
      if (byName) {
        productId = byName.id
        formatMl = byName.format_ml
      }
    }

    if (productId) {
      // Product already exists
      existing++
      console.log(
        `  [EXISTE] "${row.name}" → usar producto existente`
      )
    } else {
      // Create new product
      const code = isSinCodigo
        ? `INV-${String(++invCodeCounter).padStart(3, '0')}`
        : row.code

      const { data: newProd, error: insertErr } = await supabase
        .from('products')
        .upsert(
          {
            code,
            name: row.name,
            category_id: categoryId,
            format_ml: formatMl,
            is_active: true,
          },
          { onConflict: 'code' }
        )
        .select('id, format_ml')
        .single()

      if (insertErr || !newProd) {
        console.error(
          `  [ERROR] Fila ${row.rowNum}: no se pudo crear "${row.name}": ${insertErr?.message}`
        )
        errors++
        continue
      }

      productId = newProd.id
      formatMl = newProd.format_ml || formatMl
      created++

      // Add to lookup maps for future dedup within this run
      productByCode.set(code, { id: productId, format_ml: formatMl })
      productByName.set(normalize(row.name), {
        id: productId,
        format_ml: formatMl,
        code,
      })

      console.log(
        `  [NUEVO] "${row.name}" → ${code} (${dbCatName}, ${formatMl}ml)`
      )
    }

    // c) Calculate quantity_ml
    const quantityMl = Math.round(row.quantity * formatMl)

    inventoryUpserts.push({
      product_id: productId,
      location: TARGET_LOCATION,
      quantity_ml: quantityMl,
    })
  }

  // 5) Bulk upsert inventory records
  console.log(`\nInsertando ${inventoryUpserts.length} registros de inventario en ${TARGET_LOCATION}...`)

  // Process in batches of 50
  const batchSize = 50
  let invSuccess = 0
  let invErrors = 0

  for (let i = 0; i < inventoryUpserts.length; i += batchSize) {
    const batch = inventoryUpserts.slice(i, i + batchSize)

    const { error: invErr } = await supabase
      .from('inventory')
      .upsert(
        batch.map(item => ({
          product_id: item.product_id,
          location: item.location,
          quantity_ml: item.quantity_ml,
          min_stock_ml: 0,
        })),
        { onConflict: 'product_id,location' }
      )

    if (invErr) {
      console.error(`  Error en lote ${Math.floor(i / batchSize) + 1}:`, invErr.message)
      invErrors += batch.length
    } else {
      invSuccess += batch.length
    }
  }

  // 6) Summary
  console.log('\n=== RESUMEN ===')
  console.log(`Productos existentes reutilizados: ${existing}`)
  console.log(`Productos nuevos creados:          ${created}`)
  console.log(`Errores de producto:               ${errors}`)
  console.log(`Inventario insertado:              ${invSuccess}`)
  console.log(`Inventario errores:                ${invErrors}`)
  console.log(`Ubicacion:                         ${TARGET_LOCATION}`)
  console.log('===============\n')
}

main().catch(console.error)
