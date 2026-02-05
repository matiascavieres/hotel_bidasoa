import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LocationType } from '@/types'

export interface AlertConfig {
  id: string
  product_id: string
  location: LocationType
  min_stock_ml: number
  email_recipients: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  product?: {
    id: string
    code: string
    name: string
    format_ml: number | null
  }
}

export interface AlertWithStock extends AlertConfig {
  current_stock: number
  is_triggered: boolean
}

export function useAlertConfigs() {
  return useQuery({
    queryKey: ['alert_configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_configs')
        .select(`
          *,
          product:products(id, code, name, format_ml)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as AlertConfig[]
    },
  })
}

// Get alerts with current stock levels to determine triggered state
export function useAlertsWithStock() {
  return useQuery({
    queryKey: ['alerts_with_stock'],
    queryFn: async () => {
      // Get all active alert configs with product info
      const { data: alerts, error: alertsError } = await supabase
        .from('alert_configs')
        .select(`
          *,
          product:products(id, code, name, format_ml)
        `)
        .order('created_at', { ascending: false })

      if (alertsError) throw alertsError

      // Get inventory for all alert locations/products
      const { data: inventory, error: invError } = await supabase
        .from('inventory')
        .select('product_id, location, quantity_ml')

      if (invError) throw invError

      // Create lookup map for inventory
      const inventoryMap = new Map<string, number>()
      inventory.forEach(item => {
        const key = `${item.product_id}-${item.location}`
        inventoryMap.set(key, item.quantity_ml)
      })

      // Combine alerts with stock data
      const alertsWithStock: AlertWithStock[] = (alerts || []).map(alert => {
        const key = `${alert.product_id}-${alert.location}`
        const currentStock = inventoryMap.get(key) ?? 0
        const isTriggered = alert.is_active && currentStock < alert.min_stock_ml

        return {
          ...alert,
          current_stock: currentStock,
          is_triggered: isTriggered,
        } as AlertWithStock
      })

      return alertsWithStock
    },
  })
}

// Get only triggered alerts (for dashboard)
export function useTriggeredAlerts() {
  const { data: alertsWithStock, ...rest } = useAlertsWithStock()

  const triggeredAlerts = alertsWithStock?.filter(alert => alert.is_triggered) ?? []

  return {
    ...rest,
    data: triggeredAlerts,
  }
}

export function useCreateAlertConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config: {
      product_id: string
      location: LocationType
      min_stock_ml: number
      email_recipients: string[]
      is_active?: boolean
    }) => {
      const { data, error } = await supabase
        .from('alert_configs')
        .insert({
          ...config,
          is_active: config.is_active ?? true,
        })
        .select(`
          *,
          product:products(id, code, name, format_ml)
        `)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert_configs'] })
      queryClient.invalidateQueries({ queryKey: ['alerts_with_stock'] })
    },
  })
}

export function useUpdateAlertConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: {
        min_stock_ml?: number
        email_recipients?: string[]
        is_active?: boolean
      }
    }) => {
      const { data, error } = await supabase
        .from('alert_configs')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          product:products(id, code, name, format_ml)
        `)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert_configs'] })
      queryClient.invalidateQueries({ queryKey: ['alerts_with_stock'] })
    },
  })
}

export function useDeleteAlertConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alert_configs')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert_configs'] })
      queryClient.invalidateQueries({ queryKey: ['alerts_with_stock'] })
    },
  })
}

export function useToggleAlertConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('alert_configs')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert_configs'] })
      queryClient.invalidateQueries({ queryKey: ['alerts_with_stock'] })
    },
  })
}
