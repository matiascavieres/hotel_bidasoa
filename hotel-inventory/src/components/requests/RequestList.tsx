import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useRequests } from '@/hooks/useRequests'
import { RequestDetail } from './RequestDetail'
import {
  LOCATION_NAMES,
  REQUEST_STATUS_CONFIG,
  type RequestStatus,
  type LocationType,
} from '@/types'

interface RequestListProps {
  statusFilter: RequestStatus | 'all'
  locationFilter?: LocationType | 'all'
}

export function RequestList({ statusFilter, locationFilter }: RequestListProps) {
  const { profile, user } = useAuth()
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)

  // Fetch requests from database
  const { data: requests, isLoading, error } = useRequests(
    statusFilter,
    locationFilter && locationFilter !== 'all' ? locationFilter : undefined
  )

  const isBodeguero = profile?.role === 'bodeguero' || profile?.role === 'admin'

  // Filter requests based on user role
  const filteredRequests = (requests ?? []).filter((request) => {
    // Bartenders only see their own requests
    if (!isBodeguero && request.requester_id !== user?.id) {
      return false
    }
    return true
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRequestTitle = (dateString: string, requesterName: string, location: LocationType) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `Pedido ${day}-${month} por: ${requesterName} para: ${LOCATION_NAMES[location]}`
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
        Error al cargar las solicitudes
      </div>
    )
  }

  if (filteredRequests.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No hay solicitudes {statusFilter !== 'all' ? `${REQUEST_STATUS_CONFIG[statusFilter].label.toLowerCase()}s` : ''}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {filteredRequests.map((request) => {
          const requester = request.requester as { full_name: string } | null
          const items = (request.items || []) as Array<{
            product: { name: string } | null
            quantity_requested: number
            unit_type: string
          }>
          const status = request.status as RequestStatus
          const location = request.location as LocationType

          return (
            <Card
              key={request.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedRequest(request.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {formatRequestTitle(request.created_at, requester?.full_name || 'Usuario', location)}
                      </p>
                      <Badge
                        variant={
                          REQUEST_STATUS_CONFIG[status].color as
                            | 'success'
                            | 'warning'
                            | 'destructive'
                            | 'default'
                        }
                      >
                        {REQUEST_STATUS_CONFIG[status].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(request.created_at)}
                    </p>
                    <p className="text-sm">
                      {items.length} producto{items.length !== 1 ? 's' : ''}: {' '}
                      {items
                        .slice(0, 2)
                        .map((item) => item.product?.name || 'Producto')
                        .join(', ')}
                      {items.length > 2 && ` +${items.length - 2} más`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Ver
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetail
          requestId={selectedRequest}
          open={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </>
  )
}
