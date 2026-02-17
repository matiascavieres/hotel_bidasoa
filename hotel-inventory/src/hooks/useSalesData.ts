import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SalesData } from '@/types'

interface UseSalesDataOptions {
  grupos?: string[]
  searchQuery?: string
}

export function useSalesData(options: UseSalesDataOptions = {}) {
  const { grupos, searchQuery } = options

  return useQuery({
    queryKey: ['sales_data', grupos, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('sales_data')
        .select('*')
        .order('total', { ascending: false })

      if (grupos && grupos.length > 0) {
        query = query.in('grupo', grupos)
      }

      if (searchQuery) {
        query = query.ilike('receta', `%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as SalesData[]
    },
  })
}

export function useSalesGrupos() {
  return useQuery({
    queryKey: ['sales_grupos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_data')
        .select('grupo')

      if (error) throw error

      const unique = [...new Set(data.map((d: { grupo: string }) => d.grupo))].sort()
      return unique as string[]
    },
  })
}
