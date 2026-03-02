import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase, createRealtimeChannel } from '@/lib/supabase'
import type { LogAction, LocationType } from '@/types'

export interface Notification {
  id: string
  action: LogAction
  description: string
  location: string | null
  userId: string
  userName: string | null
  time: string
  createdAt: string
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
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
  inbound_received: 'Ingreso recibido',
  sales_import: 'Importacion de ventas',
}

const LOCATION_LABELS: Record<string, string> = {
  bodega: 'Bodega',
  bar_casa_sanz: 'Bar Casa Sanz',
  bar_hotel_bidasoa: 'Bar Hotel Bidasoa',
}

function formatRelativeTime(dateString: string): string {
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

function mapPayloadToNotification(payload: Record<string, unknown>): Notification {
  const action = (payload.action as string) || 'stock_adjustment'
  const details = payload.details as Record<string, unknown> | null
  const createdAt = (payload.created_at as string) || new Date().toISOString()

  let description = ACTION_DESCRIPTIONS[action] || action
  if (details?.product_name) {
    description += `: ${details.product_name}`
  } else if (details?.request_id) {
    description += ` #${String(details.request_id).slice(0, 8)}`
  } else if (details?.transfer_id) {
    description += ` #${String(details.transfer_id).slice(0, 8)}`
  }

  const location = payload.location as string | null
  if (location) {
    description += ` - ${LOCATION_LABELS[location] || location}`
  }

  return {
    id: (payload.id as string) || crypto.randomUUID(),
    action: action as LogAction,
    description,
    location,
    userId: (payload.user_id as string) || '',
    userName: null, // We don't have the user name from the realtime payload
    time: formatRelativeTime(createdAt),
    createdAt,
  }
}

export function useRealtimeNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const channel = createRealtimeChannel('notifications-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown>

          // Don't notify about own actions
          if (newRecord.user_id === user?.id) return

          const notification = mapPayloadToNotification(newRecord)

          setNotifications((prev) => [notification, ...prev].slice(0, 50))
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Update relative times periodically
  useEffect(() => {
    if (notifications.length === 0) return

    const interval = setInterval(() => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, time: formatRelativeTime(n.createdAt) }))
      )
    }, 60000) // every minute

    return () => clearInterval(interval)
  }, [notifications.length])

  const markAllRead = useCallback(() => {
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, markAllRead }
}
