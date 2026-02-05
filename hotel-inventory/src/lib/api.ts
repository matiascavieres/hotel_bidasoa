import { supabase } from './supabase'
import type { LocationType, UserRole } from '@/types'

// User management
export async function createUserWithProfile(
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  location: LocationType | null
) {
  // Create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error

  if (data.user) {
    // Small delay to allow the database trigger to run first
    await new Promise(resolve => setTimeout(resolve, 500))

    // Try using the admin function first (bypasses RLS)
    // Note: This RPC function may not be in the types but exists in the database
    const { error: rpcError } = await supabase.rpc('admin_create_user_profile' as never, {
      user_id: data.user.id,
      user_email: email,
      user_full_name: fullName,
      user_role: role,
      user_location: location,
    } as never)

    if (rpcError) {
      console.warn('RPC failed, trying direct upsert:', rpcError.message)

      // Fallback: try direct upsert (works if RLS allows it)
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          role,
          location,
          is_active: true,
        }, {
          onConflict: 'id',
        })

      if (upsertError) {
        console.error('Error creating user profile:', upsertError)
        throw new Error(`No se pudo crear el perfil del usuario. Por favor, crealo manualmente en Supabase con ID: ${data.user.id}`)
      }
    }
  }

  return data
}

export async function updateUserProfile(
  userId: string,
  updates: {
    full_name?: string
    role?: UserRole
    location?: LocationType | null
    is_active?: boolean
  }
) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Product management
export async function createProduct(product: {
  code: string
  name: string
  category_id: string
  format_ml?: number
  sale_price?: number
}) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProduct(
  productId: string,
  updates: {
    name?: string
    category_id?: string
    format_ml?: number
    sale_price?: number
    is_active?: boolean
  }
) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Category management
export async function createCategory(name: string, description?: string) {
  const { data: existing } = await supabase
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = existing ? existing.sort_order + 1 : 1

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, description, sort_order: sortOrder })
    .select()
    .single()

  if (error) throw error
  return data
}

// Alert configuration
export async function createAlertConfig(config: {
  product_id: string
  location: LocationType
  min_stock_ml: number
  email_recipients: string[]
}) {
  const { data, error } = await supabase
    .from('alert_configs')
    .insert(config)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAlertConfig(
  configId: string,
  updates: {
    min_stock_ml?: number
    email_recipients?: string[]
    is_active?: boolean
  }
) {
  const { data, error } = await supabase
    .from('alert_configs')
    .update(updates)
    .eq('id', configId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAlertConfig(configId: string) {
  const { error } = await supabase
    .from('alert_configs')
    .delete()
    .eq('id', configId)

  if (error) throw error
}

// CSV Import
export async function importProductsFromCSV(
  products: Array<{
    code: string
    name: string
    category: string
    format_ml?: number
    sale_price?: number
  }>
) {
  // Get or create categories
  const categoryNames = [...new Set(products.map((p) => p.category))]
  const categoryMap: Record<string, string> = {}

  for (const name of categoryNames) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name)
      .single()

    if (existing) {
      categoryMap[name] = existing.id
    } else {
      const created = await createCategory(name)
      categoryMap[name] = created.id
    }
  }

  // Insert products
  const productsToInsert = products.map((p) => ({
    code: p.code,
    name: p.name,
    category_id: categoryMap[p.category],
    format_ml: p.format_ml,
    sale_price: p.sale_price,
  }))

  const { data, error } = await supabase
    .from('products')
    .upsert(productsToInsert, { onConflict: 'code' })
    .select()

  if (error) throw error
  return data
}

// Stock check for alerts
export async function checkLowStockAlerts() {
  const { data: alerts, error: alertsError } = await supabase
    .from('alert_configs')
    .select(`
      *,
      product:products(*)
    `)
    .eq('is_active', true)

  if (alertsError) throw alertsError

  const triggeredAlerts = []

  for (const alert of alerts) {
    const { data: inventory } = await supabase
      .from('inventory')
      .select('quantity_ml')
      .eq('product_id', alert.product_id)
      .eq('location', alert.location)
      .single()

    if (!inventory || inventory.quantity_ml < alert.min_stock_ml) {
      triggeredAlerts.push({
        alert,
        currentStock: inventory?.quantity_ml || 0,
      })
    }
  }

  return triggeredAlerts
}
