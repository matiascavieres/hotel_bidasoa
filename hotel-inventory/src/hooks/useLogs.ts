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

const LOCATION_LABELS: Record<string, string> = {
  bodega: 'Bodega',
  bar_casa_sanz: 'Bar Casa Sanz',
  bar_hotel_bidasoa: 'Bar Hotel Bidasoa',
}

const ACTION_LABELS: Record<string, string> = {
  stock_adjustment: 'Ajuste de Stock',
  request_created: 'Solicitud Creada',
  request_approved: 'Solicitud Aprobada',
  request_rejected: 'Solicitud Rechazada',
  request_delivered: 'Solicitud Entregada',
  transfer_created: 'Traspaso Creado',
  transfer_completed: 'Traspaso Completado',
}

function formatStockMovements(details: Record<string, unknown>): string {
  const movements = details.stock_movements as Array<{
    product_name: string
    bodega_before: number
    bodega_after: number
    destination_before: number
    destination_after: number
  }> | undefined

  if (!movements || movements.length === 0) return ''

  const destination = details.destination as string | undefined
  const destName = destination ? (LOCATION_LABELS[destination] || destination) : 'Destino'

  return movements.map(m => {
    const bodegaBefore = Math.round(m.bodega_before / 750 * 10) / 10
    const bodegaAfter = Math.round(m.bodega_after / 750 * 10) / 10
    const destBefore = Math.round(m.destination_before / 750 * 10) / 10
    const destAfter = Math.round(m.destination_after / 750 * 10) / 10
    return `${m.product_name}: Bodega ${bodegaBefore} -> ${bodegaAfter} bot. | ${destName} ${destBefore} -> ${destAfter} bot.`
  }).join(' ; ')
}

function formatItemsList(details: Record<string, unknown>): string {
  const items = details.items as Array<{
    name: string
    quantity: number
    unit: string
  }> | undefined

  if (!items || items.length === 0) return ''

  return items.map(i => `${i.name} x${i.quantity} ${i.unit}`).join(', ')
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
    'Hora',
    'Accion',
    'Usuario',
    'Ubicacion',
    'Cambio de Estado',
    'Productos',
    'Movimientos de Stock',
  ]

  const rows = logs.map((log) => {
    const details = log.details || {}
    const date = new Date(log.created_at)

    return [
      date.toLocaleDateString('es-CL'),
      date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      ACTION_LABELS[log.action] || log.action,
      log.user?.full_name || 'N/A',
      log.location ? (LOCATION_LABELS[log.location] || log.location) : 'N/A',
      (details.status_change as string) || '',
      formatItemsList(details),
      formatStockMovements(details),
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `historial_inventario_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
