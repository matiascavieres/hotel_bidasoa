import { useState, useEffect } from 'react'
import { Check, X, Truck, Loader2, Download, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  useRequest,
  useApproveRequest,
  useRejectRequest,
  useMarkDelivered,
} from '@/hooks/useRequests'
import { LOCATION_NAMES, REQUEST_STATUS_CONFIG, type RequestStatus } from '@/types'
import { supabase } from '@/lib/supabase'

interface RequestDetailProps {
  requestId: string
  open: boolean
  onClose: () => void
}

export function RequestDetail({ requestId, open, onClose }: RequestDetailProps) {
  const { profile, user } = useAuth()
  const { toast } = useToast()
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [approvedQuantities, setApprovedQuantities] = useState<Record<string, number>>({})
  const [signedUrls, setSignedUrls] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionNotes, setRejectionNotes] = useState('')

  // Fetch request data
  const { data: request, isLoading: requestLoading } = useRequest(requestId)

  // Mutations
  const approveRequest = useApproveRequest()
  const rejectRequest = useRejectRequest()
  const markDelivered = useMarkDelivered()

  const isMutating = approveRequest.isPending || rejectRequest.isPending || markDelivered.isPending
  const isBodeguero = profile?.role === 'bodeguero' || profile?.role === 'admin'

  // Initialize availability and approved quantities state when request loads
  useEffect(() => {
    if (request?.items) {
      const initialAvailability: Record<string, boolean> = {}
      const initialQuantities: Record<string, number> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request.items.forEach((item: any) => {
        initialAvailability[item.id] = item.is_available ?? true
        initialQuantities[item.id] = item.quantity_approved ?? item.quantity_requested
      })
      setAvailability(initialAvailability)
      setApprovedQuantities(initialQuantities)
    }
  }, [request])

  // Fetch signed URLs for attached photos
  useEffect(() => {
    const paths = (request as { image_urls?: string[] } | null)?.image_urls || []
    if (paths.length === 0) {
      setSignedUrls([])
      return
    }
    supabase.storage
      .from('request-images')
      .createSignedUrls(paths, 60 * 60)
      .then(({ data }) => {
        if (data) {
          setSignedUrls(data.map((item) => item.signedUrl).filter(Boolean))
        }
      })
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
        itemApprovedQuantities: approvedQuantities,
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
        rejectionNotes: rejectionNotes || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: 'Solicitud rechazada', variant: 'destructive' })
          setShowRejectDialog(false)
          setRejectionNotes('')
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

  const handleExportCSV = () => {
    if (!request) return

    const locationName = LOCATION_NAMES[request.location as keyof typeof LOCATION_NAMES] || request.location
    const statusLabel = REQUEST_STATUS_CONFIG[status].label
    const title = formatRequestTitle(request.created_at, requesterName, request.location)

    const metaRows = [
      ['Pedido', title],
      ['Fecha', formatDate(request.created_at)],
      ['Solicitante', requesterName],
      ['Local', locationName],
      ['Estado', statusLabel],
      ['Notas', request.notes || ''],
      [],
      ['Producto', 'Código', 'Cant. Solicitada', 'Cant. Aprobada', 'Unidad', 'Disponibilidad'],
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemRows = (request.items || []).map((item: any) => {
      const product = item.product as { name: string; code: string } | null
      const availabilityText =
        item.is_available === null ? '' : item.is_available ? 'Disponible' : 'No disponible'
      const unit = item.unit_type === 'bottles' ? 'bot.' : item.unit_type
      return [
        product?.name || 'Producto',
        product?.code || '',
        String(item.quantity_requested),
        String(item.quantity_approved ?? item.quantity_requested),
        unit,
        availabilityText,
      ]
    })

    const allRows = [...metaRows, ...itemRows]
    const csvContent = allRows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const fileName = `pedido_${new Date(request.created_at).toLocaleDateString('es-CL').replace(/\//g, '-')}_${locationName.replace(/\s+/g, '_')}.csv`
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
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

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md flex flex-col">
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
          <div className="flex items-center justify-between gap-2 pt-1">
            <DialogDescription>
              Creada: {formatDate(request.created_at)}
            </DialogDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="shrink-0"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Exportar CSV
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto space-y-4 pr-1 max-h-[55vh]">
          {request.notes && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">{request.notes}</p>
            </div>
          )}

          {/* Rejection notes display */}
          {status === 'rejected' && (request as { rejection_notes?: string }).rejection_notes && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-xs font-medium text-destructive mb-1">Motivo del rechazo:</p>
              <p className="text-sm">{(request as { rejection_notes?: string }).rejection_notes}</p>
            </div>
          )}

          <Separator />

          {/* Rejection dialog inline */}
          {showRejectDialog && (
            <div className="space-y-3 rounded-md border border-destructive/30 p-3 bg-destructive/5">
              <h4 className="font-medium text-destructive text-sm">Motivo del rechazo</h4>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
                placeholder="Explica por que se rechaza esta solicitud (opcional)..."
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowRejectDialog(false); setRejectionNotes('') }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  disabled={isMutating}
                >
                  {rejectRequest.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Confirmar Rechazo
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium">Productos solicitados</h4>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(request.items || []).map((item: any) => {
              const product = item.product as { name: string; code: string; format_ml: number } | null
              const unitLabel = item.unit_type === 'bottles' ? 'bot.' : item.unit_type
              const hasReducedQty = status !== 'pending' && item.quantity_approved !== null && item.quantity_approved !== item.quantity_requested

              return (
                <div
                  key={item.id}
                  className="rounded-md border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{product?.name || 'Producto'}</p>
                      <p className="text-sm text-muted-foreground">
                        {product?.code || 'N/A'} • {item.quantity_requested} {unitLabel}
                      </p>
                      {hasReducedQty && (
                        <p className="text-xs text-orange-600 mt-0.5">
                          Aprobado: {item.quantity_approved} {unitLabel} (solicitado: {item.quantity_requested})
                        </p>
                      )}
                    </div>

                    {status !== 'pending' && item.is_available !== null && (
                      <Badge variant={item.is_available ? 'success' : 'destructive'}>
                        {item.is_available ? 'Disponible' : 'No disponible'}
                      </Badge>
                    )}
                  </div>

                  {/* Bodeguero approval controls */}
                  {isBodeguero && status === 'pending' && (
                    <div className="flex items-center gap-3 pt-1 border-t">
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

                      {(availability[item.id] ?? true) && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <label className="text-xs text-muted-foreground">Cant:</label>
                          <Input
                            type="number"
                            min={0}
                            max={item.quantity_requested}
                            value={approvedQuantities[item.id] ?? item.quantity_requested}
                            onChange={(e) => {
                              const val = Math.min(
                                Math.max(0, Number(e.target.value) || 0),
                                item.quantity_requested
                              )
                              setApprovedQuantities(prev => ({
                                ...prev,
                                [item.id]: val,
                              }))
                            }}
                            className="w-20 h-8 text-sm text-right"
                          />
                          <span className="text-xs text-muted-foreground">/ {item.quantity_requested}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Photo gallery */}
          {signedUrls.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Fotografías ({signedUrls.length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {signedUrls.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="relative aspect-square overflow-hidden rounded-md border hover:opacity-90 transition-opacity"
                      onClick={() => setLightboxIndex(idx)}
                    >
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isBodeguero && status === 'pending' && !showRejectDialog && (
            <>
              <Button
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                disabled={isMutating}
              >
                <X className="mr-2 h-4 w-4" />
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

    {/* Lightbox */}
    {lightboxIndex !== null && (
      <Dialog open onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            <img
              src={signedUrls[lightboxIndex]}
              alt={`Foto ${lightboxIndex + 1}`}
              className="max-h-[80vh] max-w-full object-contain rounded"
            />
            {signedUrls.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + signedUrls.length) % signedUrls.length) }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % signedUrls.length) }}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {lightboxIndex + 1} / {signedUrls.length}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  )
}
