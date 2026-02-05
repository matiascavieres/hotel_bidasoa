import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, createRealtimeChannel } from '@/lib/supabase'

export function useRealtimeInventory(location?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = createRealtimeChannel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          ...(location && { filter: `location=eq.${location}` }),
        },
        () => {
          // Invalidate inventory queries when data changes
          queryClient.invalidateQueries({ queryKey: ['inventory'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, location])
}

export function useRealtimeRequests() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = createRealtimeChannel('requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['requests'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}

export function useRealtimeTransfers() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = createRealtimeChannel('transfers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfers',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transfers'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}

// Combined hook for all realtime subscriptions
export function useRealtimeSubscriptions(location?: string) {
  useRealtimeInventory(location)
  useRealtimeRequests()
  useRealtimeTransfers()
}
