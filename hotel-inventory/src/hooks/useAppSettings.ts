import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface InventoryModeValue {
  enabled: boolean
}

interface AppSetting {
  key: string
  value: InventoryModeValue
  updated_at: string
  updated_by: string | null
}

export function useInventoryMode() {
  return useQuery({
    queryKey: ['app-settings', 'inventory_mode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'inventory_mode')
        .single()

      if (error) {
        // Table might not exist yet, default to disabled
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return { enabled: false }
        }
        throw error
      }

      return (data as AppSetting).value
    },
    staleTime: 30_000, // Refresh every 30s to catch admin toggles
  })
}

export function useToggleInventoryMode() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('app_settings')
        .update({
          value: { enabled } as unknown as Record<string, unknown>,
          updated_by: user?.id,
        })
        .eq('key', 'inventory_mode')

      if (error) throw error
      return { enabled }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings', 'inventory_mode'] })
    },
  })
}
