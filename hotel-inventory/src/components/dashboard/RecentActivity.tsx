import { History, Package, ClipboardCheck, ArrowLeftRight, UserPlus, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLogs } from '@/hooks/useLogs'
import { cn } from '@/lib/utils'
import { LOCATION_NAMES, type LogAction, type LocationType } from '@/types'

interface RecentActivityProps {
  className?: string
}

// Action descriptions for different log types
const ACTION_DESCRIPTIONS: Record<LogAction, string> = {
  stock_adjustment: 'Ajuste de stock',
  request_created: 'Solicitud creada',
  request_approved: 'Solicitud aprobada',
  request_rejected: 'Solicitud rechazada',
  request_delivered: 'Solicitud entregada',
  transfer_created: 'Traspaso creado',
  transfer_completed: 'Traspaso completado',
  product_created: 'Producto creado',
  product_updated: 'Producto actualizado',
  user_created: 'Usuario creado',
  user_updated: 'Usuario actualizado',
}

export function RecentActivity({ className }: RecentActivityProps) {
  const { data: logs, isLoading, error } = useLogs({})

  // Transform logs data for display (only show last 6)
  const activities = (logs ?? []).slice(0, 6).map(log => {
    // Build description from log details
    let description = ACTION_DESCRIPTIONS[log.action as LogAction] || log.action

    // Add more context from details if available
    const details = log.details as Record<string, unknown> | null
    if (details) {
      if (details.product_name) {
        description += `: ${details.product_name}`
      } else if (details.request_id) {
        description += ` #${String(details.request_id).slice(0, 8)}`
      } else if (details.transfer_id) {
        description += ` #${String(details.transfer_id).slice(0, 8)}`
      }
    }

    // Add location context
    if (log.location) {
      description += ` - ${LOCATION_NAMES[log.location as LocationType]}`
    }

    return {
      id: log.id,
      type: log.action as LogAction,
      description,
      user: log.user?.full_name ?? 'Sistema',
      time: formatActivityTime(log.created_at),
    }
  })

  function formatActivityTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins}m`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays}d`

    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
    })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'request_delivered':
      case 'request_approved':
      case 'request_created':
      case 'request_rejected':
        return ClipboardCheck
      case 'transfer_completed':
      case 'transfer_created':
        return ArrowLeftRight
      case 'stock_adjustment':
      case 'product_created':
      case 'product_updated':
        return Package
      case 'user_created':
      case 'user_updated':
        return UserPlus
      default:
        return History
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'request_delivered':
      case 'request_approved':
      case 'transfer_completed':
        return 'text-success'
      case 'request_rejected':
        return 'text-destructive'
      case 'transfer_created':
      case 'request_created':
        return 'text-primary'
      case 'stock_adjustment':
        return 'text-warning'
      case 'product_created':
      case 'product_updated':
      case 'user_created':
      case 'user_updated':
        return 'text-muted-foreground'
      default:
        return 'text-muted-foreground'
    }
  }

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-8 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Error al cargar actividad</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No hay actividad reciente
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getIcon(activity.type)
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={cn('mt-0.5', getIconColor(activity.type))}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm line-clamp-2">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{activity.user}</span>
                      <span>•</span>
                      <span>{activity.time}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
