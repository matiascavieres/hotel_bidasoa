import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

      if (error) {
        console.error('[useProducts] Error:', error)
        throw error
      }

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

      if (error) {
        console.error('[useCategories] Error:', error)
        throw error
      }

      return data
    },
  })
}
