import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { sendLowStockAlertEmail, getAdminEmails } from '@/lib/email'
import type { LocationType } from '@/types'

export function useInventory(location?: LocationType) {
  return useQuery({
    queryKey: ['inventory', location],
    queryFn: async () => {
      let query = supabase
        .from('inventory')
        .select(`
          *,
          product:products(
            *,
            category:categories(*)
          )
        `)

      if (location) {
        query = query.eq('location', location)
      }

      const { data, error } = await query.order('product_id')

      if (error) throw error
      return data
    },
  })
}

export function useUpdateInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      productId,
      location,
      quantityMl,
    }: {
      productId: string
      location: LocationType
      quantityMl: number
    }) => {
      const { data, error } = await supabase
        .from('inventory')
        .upsert(
          {
            product_id: productId,
            location,
            quantity_ml: quantityMl,
          },
          {
            onConflict: 'product_id,location',
          }
        )
        .select()
        .single()

      if (error) throw error

      // Check for low stock and send alert if needed
      const { data: product } = await supabase
        .from('products')
        .select('name, code')
        .eq('id', productId)
        .single()

      // min_stock_ml is on inventory table, not products
      const minStockMl = data?.min_stock_ml

      if (product && minStockMl && quantityMl < minStockMl) {
        // Send low stock alert asynchronously (don't block the main operation)
        getAdminEmails().then(emails => {
          if (emails.length > 0) {
            sendLowStockAlertEmail({
              productName: product.name,
              productCode: product.code,
              location,
              currentStock: quantityMl,
              minStock: minStockMl,
              recipients: emails,
            })
          }
        })
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data
    },
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order')

      if (error) throw error
      return data
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const { data: existing } = await supabase
        .from('categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const sortOrder = existing ? existing.sort_order + 1 : 1

      const { data, error } = await supabase
        .from('categories')
        .insert({ name, sort_order: sortOrder })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      code,
      name,
      categoryId,
      formatMl,
      salePrice,
      pricePerKg,
    }: {
      code: string
      name: string
      categoryId: string
      formatMl: number
      salePrice?: number
      pricePerKg?: number
    }) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          code,
          name,
          category_id: categoryId,
          format_ml: formatMl,
          sale_price: salePrice,
          price_per_kg: pricePerKg ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .select(`
          *,
          category:categories(*)
        `)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      code,
      name,
      categoryId,
      formatMl,
      salePrice,
      pricePerKg,
      imageUrl,
    }: {
      id: string
      code: string
      name: string
      categoryId: string
      formatMl: number
      salePrice?: number
      pricePerKg?: number | null
      imageUrl?: string | null
    }) => {
      const updateData: Record<string, unknown> = {
        code,
        name,
        category_id: categoryId,
        format_ml: formatMl,
        sale_price: salePrice,
        price_per_kg: pricePerKg ?? null,
      }

      // Only include image_url if explicitly provided (including null to clear)
      if (imageUrl !== undefined) {
        updateData.image_url = imageUrl
      }

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          category:categories(*)
        `)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useCreateMissingInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: Array<{ product_id: string; location: LocationType }>) => {
      const rows = items.map(item => ({
        product_id: item.product_id,
        location: item.location,
        quantity_ml: 0,
        min_stock_ml: 0,
      }))

      const { data, error } = await supabase
        .from('inventory')
        .upsert(rows, { onConflict: 'product_id,location' })
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
