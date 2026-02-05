import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = 'https://uoojckrqfaeatdqokjln.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvb2pja3JxZmFlYXRkcW9ramxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzI1NjksImV4cCI6MjA4NTAwODU2OX0.hzV30KYg17OXtrQseRlFkfSZahx5aHvwwjRAr3k9vKc'

const supabase = createClient(supabaseUrl, supabaseKey)

interface CsvRow {
  name: string
  type: string
  format_ml: number | null
  code: string
  sale_price: number | null
}

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  // Skip header
  const dataLines = lines.slice(1)

  return dataLines.map(line => {
    // Handle quoted fields with commas
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

    const [name, type, format, code, price] = parts

    // Parse format_ml - handle special cases like "5kg"
    let format_ml: number | null = null
    if (format && !format.includes('kg')) {
      const parsed = parseInt(format, 10)
      if (!isNaN(parsed)) {
        format_ml = parsed
      }
    }

    // Parse price
    let sale_price: number | null = null
    if (price) {
      const parsed = parseInt(price, 10)
      if (!isNaN(parsed)) {
        sale_price = parsed
      }
    }

    return {
      name: name || '',
      type: type || 'Otros',
      format_ml,
      code: code || '',
      sale_price
    }
  }).filter(row => row.name && row.code)
}

async function importData() {
  const csvPath = path.resolve('C:/Users/matca/Downloads/Casa Sanz Inventario Tiempo Real - Inventario Actual.csv')

  console.log('Reading CSV file...')
  const rows = parseCsv(csvPath)
  console.log(`Found ${rows.length} products`)

  // Get unique categories
  const uniqueCategories = [...new Set(rows.map(r => r.type.toLowerCase()))]
  console.log(`Found ${uniqueCategories.length} unique categories:`, uniqueCategories)

  // Create categories
  console.log('\nCreating categories...')
  const categoryMap: Record<string, string> = {}

  for (let i = 0; i < uniqueCategories.length; i++) {
    const categoryName = uniqueCategories[i]
    const displayName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1)

    const { data, error } = await supabase
      .from('categories')
      .upsert(
        { name: displayName, sort_order: i + 1 },
        { onConflict: 'name' }
      )
      .select()
      .single()

    if (error) {
      console.error(`Error creating category ${displayName}:`, error.message)
      // Try to fetch existing
      const { data: existing } = await supabase
        .from('categories')
        .select()
        .eq('name', displayName)
        .single()

      if (existing) {
        categoryMap[categoryName] = existing.id
        console.log(`  Using existing category: ${displayName}`)
      }
    } else if (data) {
      categoryMap[categoryName] = data.id
      console.log(`  Created/updated category: ${displayName}`)
    }
  }

  // Create products
  console.log('\nCreating products...')
  let successCount = 0
  let errorCount = 0

  for (const row of rows) {
    const categoryId = categoryMap[row.type.toLowerCase()]

    if (!categoryId) {
      console.error(`  No category found for: ${row.name} (${row.type})`)
      errorCount++
      continue
    }

    const { error } = await supabase
      .from('products')
      .upsert(
        {
          code: row.code,
          name: row.name,
          category_id: categoryId,
          format_ml: row.format_ml,
          sale_price: row.sale_price,
          is_active: true
        },
        { onConflict: 'code' }
      )

    if (error) {
      console.error(`  Error creating product ${row.name}:`, error.message)
      errorCount++
    } else {
      successCount++
    }
  }

  console.log(`\nImport complete!`)
  console.log(`  Success: ${successCount}`)
  console.log(`  Errors: ${errorCount}`)
}

importData().catch(console.error)
