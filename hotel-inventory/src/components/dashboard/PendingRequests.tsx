import { Link } from 'react-router-dom'
import { ClipboardList, ArrowRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRequests } from '@/hooks/useRequests'
import { LOCATION_NAMES } from '@/types'

export function PendingRequests() {
  const { data: requests, isLoading, error } = useRequests('pending')

  // Transform requests data for display
  const pendingRequests = (requests ?? []).slice(0, 5).map(request => ({
    id: request.id,
    requester: request.requester?.full_name ?? 'Usuario',
    location: request.location,
    itemCount: request.items?.length ?? 0,
    createdAt: request.created_at,
  }))

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Solicitudes Pendientes
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Solicitudes Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-destructive py-4">
            Error al cargar solicitudes
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Solicitudes Pendientes
          {pendingRequests.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingRequests.length}
            </Badge>
          )}
        </CardTitle>
        <Link to="/solicitudes">
          <Button variant="ghost" size="sm">
            Ver todas
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No hay solicitudes pendientes
          </p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <Link
                key={request.id}
                to={`/solicitudes?id=${request.id}`}
                className="block"
              >
                <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors">
                  <div className="space-y-1">
                    <p className="font-medium">{request.requester}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {LOCATION_NAMES[request.location]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {request.itemCount} productos
                      </span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(request.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
