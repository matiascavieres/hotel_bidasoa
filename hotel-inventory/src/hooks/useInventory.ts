import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { sendLowStockAlertEmail, getAdminEmails } from '@/lib/email'
import type { LocationType } from '@/types'

export function useInventory(location?: LocationType) {
  return useQuery({
    queryKey: ['inventory', location],
    queryFn: async () => {
      console.log('[useInventory] Fetching inventory for location:', location)

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

      console.log('[useInventory] Response:', { data, error, count: data?.length })

      if (error) {
        console.error('[useInventory] Error:', error)
        throw error
      }
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

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      code,
      name,
      categoryId,
      formatMl,
      salePrice,
    }: {
      code: string
      name: string
      categoryId: string
      formatMl: number
      salePrice?: number
    }) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          code,
          name,
          category_id: categoryId,
          format_ml: formatMl,
          sale_price: salePrice,
        })
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
    }: {
      id: string
      code: string
      name: string
      categoryId: string
      formatMl: number
      salePrice?: number
    }) => {
      const { data, error } = await supabase
        .from('products')
        .update({
          code,
          name,
          category_id: categoryId,
          format_ml: formatMl,
          sale_price: salePrice,
        })
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
    },
  })
}
