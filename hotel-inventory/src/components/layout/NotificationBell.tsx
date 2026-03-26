import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Package,
  ClipboardCheck,
  ArrowLeftRight,
  UserPlus,
  History,
  PackagePlus,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useRealtimeNotifications, type Notification } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

const ACTION_ROUTES: Record<string, string> = {
  request_created:   '/solicitudes',
  request_approved:  '/solicitudes',
  request_rejected:  '/solicitudes',
  request_delivered: '/solicitudes',
  transfer_created:  '/traspasos',
  transfer_completed:'/traspasos',
  stock_adjustment:  '/stock',
  inbound_received:  '/inbound',
  sales_import:      '/ventas',
  product_created:   '/admin/catalogo',
  product_updated:   '/admin/catalogo',
  user_created:      '/admin/usuarios',
  user_updated:      '/admin/usuarios',
}

function getIcon(action: string) {
  switch (action) {
    case 'request_delivered':
    case 'request_approved':
    case 'request_created':
    case 'request_rejected':
      return ClipboardCheck
    case 'transfer_completed':
    case 'transfer_created':
      return ArrowLeftRight
    case 'stock_adjustment':
      return Package
    case 'product_created':
    case 'product_updated':
      return Package
    case 'user_created':
    case 'user_updated':
      return UserPlus
    case 'inbound_received':
      return PackagePlus
    case 'sales_import':
      return TrendingUp
    default:
      return History
  }
}

function getIconColor(action: string) {
  switch (action) {
    case 'request_delivered':
    case 'request_approved':
    case 'transfer_completed':
      return 'text-green-600'
    case 'request_rejected':
      return 'text-destructive'
    case 'transfer_created':
    case 'request_created':
      return 'text-primary'
    case 'stock_adjustment':
      return 'text-amber-500'
    case 'inbound_received':
      return 'text-blue-500'
    default:
      return 'text-muted-foreground'
  }
}

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: Notification
  onNavigate: (route: string) => void
}) {
  const Icon = getIcon(notification.action)
  const iconColor = getIconColor(notification.action)
  const route = ACTION_ROUTES[notification.action]

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 transition-colors',
        route ? 'cursor-pointer hover:bg-accent/50' : 'hover:bg-accent/30',
      )}
      onClick={() => route && onNavigate(route)}
    >
      <div className={cn('mt-0.5 shrink-0', iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm leading-snug line-clamp-2">{notification.description}</p>
        <p className="text-xs text-muted-foreground">{notification.time}</p>
      </div>
    </div>
  )
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useRealtimeNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleNavigate(route: string) {
    setOpen(false)
    markAllRead()
    navigate(route)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3">
          <h4 className="text-sm font-semibold">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-muted-foreground"
              onClick={markAllRead}
            >
              Marcar como leido
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
              <p className="text-xs mt-1">Las actualizaciones apareceran aqui</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
