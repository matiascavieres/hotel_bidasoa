import {
  Package,
  ClipboardCheck,
  ClipboardX,
  Truck,
  ArrowLeftRight,
  Edit,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLogs } from '@/hooks/useLogs'
import { LOCATION_NAMES } from '@/types'

interface LogTimelineProps {
  actionFilter: string
  dateFrom: string
  dateTo: string
}

interface StockMovement {
  product_name: string
  product_code: string
  quantity_moved: number
  unit: string
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
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'stock_adjustment':
      return Edit
    case 'request_created':
    case 'request_approved':
      return ClipboardCheck
    case 'request_rejected':
      return ClipboardX
    case 'request_delivered':
      return Truck
    case 'transfer_created':
    case 'transfer_completed':
      return ArrowLeftRight
    default:
      return Package
  }
}

const getActionColor = (action: string) => {
  switch (action) {
    case 'request_approved':
    case 'request_delivered':
    case 'transfer_completed':
      return 'text-success'
    case 'request_rejected':
      return 'text-destructive'
    case 'stock_adjustment':
      return 'text-warning'
    default:
      return 'text-primary'
  }
}

const getActionLabel = (action: string) => {
  switch (action) {
    case 'stock_adjustment':
      return 'Ajuste'
    case 'request_created':
      return 'Solicitud'
    case 'request_approved':
      return 'Aprobada'
    case 'request_rejected':
      return 'Rechazada'
    case 'request_delivered':
      return 'Entregada'
    case 'transfer_created':
      return 'Traspaso'
    case 'transfer_completed':
      return 'Completado'
    default:
      return action
  }
}

const getDescription = (log: LogEntry) => {
  const details = log.details as Record<string, unknown>
  const destination = details.destination as string | undefined
  const destinationName = destination ? LOCATION_NAMES[destination as keyof typeof LOCATION_NAMES] || destination : ''

  switch (log.action) {
    case 'stock_adjustment':
      return `Ajuste de stock: ${details.product_name || 'Producto'}`
    case 'request_created':
      return `Nueva solicitud creada (${details.items_count || 0} productos)`
    case 'request_approved':
      return `Solicitud aprobada por ${details.approver_name || 'Bodeguero'} (${details.items_approved || 0}/${details.items_count || 0} disponibles)`
    case 'request_rejected':
      return `Solicitud rechazada por ${details.approver_name || 'Bodeguero'}`
    case 'request_delivered':
      return `Solicitud entregada a ${destinationName} (${details.items_count || 0} productos)`
    case 'transfer_created':
      return `Nuevo traspaso creado (${details.items_count || 0} productos)`
    case 'transfer_completed':
      return `Traspaso completado (${details.items_count || 0} productos)`
    default:
      return `${log.entity_type} #${log.entity_id.slice(0, 8)}`
  }
}

// Component to show stock movement details
function StockMovementDetails({ movements, destination }: { movements: StockMovement[], destination: string }) {
  const [expanded, setExpanded] = useState(false)
  const destinationName = LOCATION_NAMES[destination as keyof typeof LOCATION_NAMES] || destination

  if (!movements || movements.length === 0) return null

  // Convert ml to bottles for display (assuming 750ml per bottle)
  const mlToBottles = (ml: number) => {
    const bottles = ml / 750
    if (bottles === Math.floor(bottles)) {
      return `${bottles} bot.`
    }
    return `${bottles.toFixed(1)} bot.`
  }

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronUp className="mr-1 h-3 w-3" />
        ) : (
          <ChevronDown className="mr-1 h-3 w-3" />
        )}
        Ver movimientos de stock
      </Button>

      {expanded && (
        <div className="mt-2 space-y-2 rounded-md bg-muted/50 p-3">
          {movements.map((movement, idx) => (
            <div key={idx} className="text-sm">
              <div className="font-medium text-foreground">
                {movement.product_name}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-orange-600 dark:text-orange-400">
                  Bodega: {mlToBottles(movement.bodega_before)}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="text-orange-600 dark:text-orange-400">
                  {mlToBottles(movement.bodega_after)}
                </span>
                <span className="mx-1">|</span>
                <span className="text-green-600 dark:text-green-400">
                  {destinationName}: {mlToBottles(movement.destination_before)}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="text-green-600 dark:text-green-400">
                  {mlToBottles(movement.destination_after)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LogTimeline({ actionFilter, dateFrom, dateTo }: LogTimelineProps) {
  const { data: logs, isLoading, error } = useLogs({
    action: actionFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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

  // Group logs by date
  const groupedLogs = logs.reduce((groups, log) => {
    const date = formatDate(log.created_at)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log as LogEntry)
    return groups
  }, {} as Record<string, LogEntry[]>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedLogs).map(([date, dateLogs]) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {date}
          </h3>
          <div className="space-y-3">
            {dateLogs.map((log) => {
              const Icon = getActionIcon(log.action)
              const user = log.user as { full_name: string } | null
              const details = log.details as Record<string, unknown>
              const statusChange = details.status_change as string | undefined
              const stockMovements = details.stock_movements as StockMovement[] | undefined
              const destination = details.destination as string | undefined

              return (
                <Card key={log.id}>
                  <CardContent className="flex items-start gap-4 p-4">
                    <div
                      className={cn(
                        'mt-1 rounded-full bg-muted p-2',
                        getActionColor(log.action)
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {getActionLabel(log.action)}
                        </Badge>
                        {statusChange && (
                          <Badge variant="secondary" className="text-xs">
                            {statusChange}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(log.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{getDescription(log)}</p>
                      <p className="text-xs text-muted-foreground">
                        Por: {user?.full_name || 'Usuario'}
                      </p>

                      {/* Show stock movements for delivered requests */}
                      {log.action === 'request_delivered' && stockMovements && destination && (
                        <StockMovementDetails
                          movements={stockMovements}
                          destination={destination}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
