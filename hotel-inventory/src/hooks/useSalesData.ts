import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SalesData } from '@/types'

interface UseSalesDataOptions {
  grupo?: string
  searchQuery?: string
}

export function useSalesData(options: UseSalesDataOptions = {}) {
  const { grupo, searchQuery } = options

  return useQuery({
    queryKey: ['sales_data', grupo, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('sales_data')
        .select('*')
        .order('total', { ascending: false })

      if (grupo && grupo !== 'all') {
        query = query.eq('grupo', grupo)
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
