import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLogs } from '@/hooks/useLogs'
import { LOCATION_NAMES } from '@/types'

interface LogTableProps {
  actionFilter: string
  dateFrom: string
  dateTo: string
}

interface StockMovement {
  product_name: string
  bodega_before: number
  bodega_after: number
  destination_before: number
  destination_after: number
}

interface LogEntry {
  id: string
  action: string
  user: { full_name: string } | null
  entity_type: string
  entity_id: string
  details: Record<string, unknown>
  created_at: string
  location: string | null
}

const ACTION_LABELS: Record<string, string> = {
  stock_adjustment: 'Ajuste de Stock',
  request_created: 'Solicitud Creada',
  request_approved: 'Solicitud Aprobada',
  request_rejected: 'Solicitud Rechazada',
  request_delivered: 'Solicitud Entregada',
  transfer_created: 'Traspaso Creado',
  transfer_completed: 'Traspaso Completado',
  inbound_received: 'Ingreso Recibido',
  product_created: 'Producto Creado',
  product_updated: 'Producto Actualizado',
  sales_import: 'Importación Ventas',
}

const ACTION_COLORS: Record<string, string> = {
  request_approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  request_delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  transfer_completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  request_rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  stock_adjustment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  inbound_received: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  product_updated: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
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

function formatStockAdjustment(details: Record<string, unknown>): string {
  const prevBottles = details.previous_bottles as number | undefined
  const newBottles = details.new_bottles as number | undefined
  const productName = details.product_name as string | undefined
  if (prevBottles === undefined || newBottles === undefined) return ''
  return `${productName || 'Producto'}: ${prevBottles} → ${newBottles} bot.`
}

function formatStockMovements(details: Record<string, unknown>): string {
  const movements = details.stock_movements as StockMovement[] | undefined
  if (!movements || movements.length === 0) return ''

  const destination = details.destination as string | undefined
  const destName = destination
    ? (LOCATION_NAMES[destination as keyof typeof LOCATION_NAMES] || destination)
    : 'Destino'

  return movements.map(m => {
    const bodegaBefore = Math.round(m.bodega_before / 750 * 10) / 10
    const bodegaAfter = Math.round(m.bodega_after / 750 * 10) / 10
    const destBefore = Math.round(m.destination_before / 750 * 10) / 10
    const destAfter = Math.round(m.destination_after / 750 * 10) / 10
    return `${m.product_name}: Bodega ${bodegaBefore} -> ${bodegaAfter} bot. | ${destName} ${destBefore} -> ${destAfter} bot.`
  }).join(' ; ')
}

export function LogTable({ actionFilter, dateFrom, dateTo }: LogTableProps) {
  const { data: logs, isLoading, error } = useLogs({
    action: actionFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive">
        Error al cargar los registros
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No hay registros que coincidan con los filtros
      </div>
    )
  }

  const typedLogs = logs as LogEntry[]

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Fecha</th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Hora</th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Accion</th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Usuario</th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Ubicacion</th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Cambio de Estado</th>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Productos</th>
            <th className="px-3 py-2 text-left font-medium min-w-[300px]">Movimientos de Stock</th>
          </tr>
        </thead>
        <tbody>
          {typedLogs.map((log) => {
            const details = (log.details || {}) as Record<string, unknown>
            const date = new Date(log.created_at)
            const statusChange = details.status_change as string | undefined
            const items = formatItemsList(details)
            const movements = formatStockMovements(details)
            const locationName = log.location
              ? (LOCATION_NAMES[log.location as keyof typeof LOCATION_NAMES] || log.location)
              : ''
            const actionColor = ACTION_COLORS[log.action] || ''

            return (
              <tr key={log.id} className="border-b hover:bg-muted/30">
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Badge variant="outline" className={actionColor}>
                    {ACTION_LABELS[log.action] || log.action}
                  </Badge>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {(log.user as { full_name: string } | null)?.full_name || 'N/A'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {locationName || ''}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {statusChange && (
                    <Badge variant="secondary" className="text-xs">
                      {statusChange}
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  {items && (
                    <span className="text-xs">{items}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {movements ? (
                    <span className="text-xs text-muted-foreground">{movements}</span>
                  ) : log.action === 'stock_adjustment' ? (
                    <span className="text-xs text-muted-foreground">
                      {formatStockAdjustment(details)}
                    </span>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
