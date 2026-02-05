import { useState, useEffect } from 'react'
import { Check, X, Truck, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  useRequest,
  useApproveRequest,
  useRejectRequest,
  useMarkDelivered,
} from '@/hooks/useRequests'
import { LOCATION_NAMES, REQUEST_STATUS_CONFIG, type RequestStatus } from '@/types'

interface RequestDetailProps {
  requestId: string
  open: boolean
  onClose: () => void
}

export function RequestDetail({ requestId, open, onClose }: RequestDetailProps) {
  const { profile, user } = useAuth()
  const { toast } = useToast()
  const [availability, setAvailability] = useState<Record<string, boolean>>({})

  // Fetch request data
  const { data: request, isLoading: requestLoading } = useRequest(requestId)

  // Mutations
  const approveRequest = useApproveRequest()
  const rejectRequest = useRejectRequest()
  const markDelivered = useMarkDelivered()

  const isMutating = approveRequest.isPending || rejectRequest.isPending || markDelivered.isPending
  const isBodeguero = profile?.role === 'bodeguero' || profile?.role === 'admin'

  // Initialize availability state when request loads
  useEffect(() => {
    if (request?.items) {
      const initialAvailability: Record<string, boolean> = {}
      request.items.forEach(item => {
        initialAvailability[item.id] = item.is_available ?? true
      })
      setAvailability(initialAvailability)
    }
  }, [request])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRequestTitle = (dateString: string, requesterName: string, location: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `Pedido ${day}-${month} por: ${requesterName} para: ${LOCATION_NAMES[location as keyof typeof LOCATION_NAMES]}`
  }

  const handleApprove = async () => {
    if (!user?.id || !request) return

    approveRequest.mutate(
      {
        requestId: request.id,
        approverId: user.id,
        approverName: profile?.full_name || 'Bodeguero',
        itemAvailability: availability,
      },
      {
        onSuccess: () => {
          toast({ title: 'Solicitud aprobada' })
          onClose()
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'No se pudo aprobar la solicitud',
            variant: 'destructive',
          })
        },
      }
    )
  }

  const handleReject = async () => {
    if (!user?.id || !request) return

    rejectRequest.mutate(
      {
        requestId: request.id,
        approverId: user.id,
        approverName: profile?.full_name || 'Bodeguero',
      },
      {
        onSuccess: () => {
          toast({ title: 'Solicitud rechazada', variant: 'destructive' })
          onClose()
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'No se pudo rechazar la solicitud',
            variant: 'destructive',
          })
        },
      }
    )
  }

  const handleMarkDelivered = async () => {
    if (!user?.id || !request) return

    markDelivered.mutate(
      {
        requestId: request.id,
        delivererId: user.id,
        delivererName: profile?.full_name || 'Bodeguero',
      },
      {
        onSuccess: () => {
          toast({ title: 'Solicitud marcada como entregada' })
          onClose()
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'No se pudo marcar como entregada',
            variant: 'destructive',
          })
        },
      }
    )
  }

  const toggleAvailability = (itemId: string) => {
    setAvailability((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  if (requestLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!request) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              No se pudo cargar la solicitud
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const requesterName = (request.requester as { full_name: string } | null)?.full_name || 'Usuario'
  const status = request.status as RequestStatus

  // Debug: Log status para verificar
  console.log('[RequestDetail] Request ID:', request.id)
  console.log('[RequestDetail] Status:', status)
  console.log('[RequestDetail] isBodeguero:', isBodeguero)
  console.log('[RequestDetail] Show approve buttons:', isBodeguero && status === 'pending')
  console.log('[RequestDetail] Show deliver button:', isBodeguero && status === 'approved')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {formatRequestTitle(request.created_at, requesterName, request.location)}
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
          </DialogTitle>
          <DialogDescription>
            Creada: {formatDate(request.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {request.notes && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">{request.notes}</p>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Productos solicitados</h4>
            {(request.items || []).map((item) => {
              const product = item.product as { name: string; code: string; format_ml: number } | null
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{product?.name || 'Producto'}</p>
                    <p className="text-sm text-muted-foreground">
                      {product?.code || 'N/A'} • {item.quantity_requested}{' '}
                      {item.unit_type === 'bottles' ? 'bot.' : item.unit_type}
                    </p>
                  </div>

                  {isBodeguero && status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`available-${item.id}`}
                        checked={availability[item.id] ?? true}
                        onCheckedChange={() => toggleAvailability(item.id)}
                      />
                      <label
                        htmlFor={`available-${item.id}`}
                        className="text-sm"
                      >
                        Disponible
                      </label>
                    </div>
                  )}

                  {status !== 'pending' && item.is_available !== null && (
                    <Badge variant={item.is_available ? 'success' : 'destructive'}>
                      {item.is_available ? 'Disponible' : 'No disponible'}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isBodeguero && status === 'pending' && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isMutating}
              >
                {rejectRequest.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Rechazar
              </Button>
              <Button onClick={handleApprove} disabled={isMutating}>
                {approveRequest.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Aprobar
              </Button>
            </>
          )}

          {isBodeguero && status === 'approved' && (
            <Button onClick={handleMarkDelivered} disabled={isMutating}>
              {markDelivered.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Truck className="mr-2 h-4 w-4" />
              )}
              Marcar Entregada
            </Button>
          )}

          {!isBodeguero && (
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
