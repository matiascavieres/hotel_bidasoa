import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LogAction, LocationType } from '@/types'
import type { Json } from '@/types/database'

interface LogFilters {
  action?: string
  dateFrom?: string
  dateTo?: string
  userId?: string
  location?: LocationType
}

export function useLogs(filters: LogFilters = {}) {
  return useQuery({
    queryKey: ['logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:users(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filters.action && filters.action !== 'all') {
        query = query.eq('action', filters.action)
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.location) {
        query = query.eq('location', filters.location)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
  })
}

export function useCreateLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      action,
      entityType,
      entityId,
      location,
      details,
    }: {
      userId: string
      action: LogAction
      entityType: string
      entityId: string
      location?: LocationType
      details?: Json
    }) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          location,
          details: details || {},
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}

export function exportLogsToCSV(logs: Array<{
  created_at: string
  action: string
  user?: { full_name: string }
  entity_type: string
  entity_id: string
  location?: string
  details: Record<string, unknown>
}>) {
  const headers = [
    'Fecha',
    'Accion',
    'Usuario',
    'Tipo',
    'ID',
    'Ubicacion',
    'Detalles',
  ]

  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString('es-CL'),
    log.action,
    log.user?.full_name || 'N/A',
    log.entity_type,
    log.entity_id,
    log.location || 'N/A',
    JSON.stringify(log.details),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
