import { useState, useEffect } from 'react'
import { Loader2, FileText, Building2, ImageIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
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
import { useInbound } from '@/hooks/useInbounds'
import { supabase } from '@/lib/supabase'

interface InboundDetailProps {
  inboundId: string
  open: boolean
  onClose: () => void
}

export function InboundDetail({ inboundId, open, onClose }: InboundDetailProps) {
  const { data: inbound, isLoading } = useInbound(inboundId)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [signedUrls, setSignedUrls] = useState<string[]>([])

  // Generar signed URLs para las imágenes del bucket privado
  useEffect(() => {
    const paths = inbound?.image_urls || []
    if (paths.length === 0) {
      setSignedUrls([])
      return
    }

    let cancelled = false
    supabase.storage
      .from('inbound-images')
      .createSignedUrls(paths, 60 * 60) // 1 hora de validez
      .then(({ data }) => {
        if (!cancelled && data) {
          setSignedUrls(data.map((d) => d.signedUrl || '').filter(Boolean))
        }
      })

    return () => { cancelled = true }
  }, [inbound])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getUnitLabel = (unit: string, quantity: number) => {
    switch (unit) {
      case 'bottles':
        return quantity === 1 ? 'botella' : 'botellas'
      case 'ml':
        return 'ml'
      case 'units':
        return quantity === 1 ? 'unidad' : 'unidades'
      default:
        return unit
    }
  }

  const imagePaths = inbound?.image_urls || []
  const imageUrls = signedUrls

  if (isLoading) {
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

  if (!inbound) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>No se pudo cargar el ingreso</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const creatorName = inbound.creator?.full_name || 'Usuario'

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Ingreso del {new Date(inbound.received_at).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
              <Badge variant="success">Recibido</Badge>
            </DialogTitle>
            <DialogDescription>
              Registrado por {creatorName} el {formatDate(inbound.received_at)}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto space-y-4 pr-1 max-h-[55vh]">
            {/* Número de factura */}
            {inbound.invoice_number && (
              <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Número de factura</p>
                  <p className="font-medium">{inbound.invoice_number}</p>
                </div>
              </div>
            )}

            {/* Notas */}
            {inbound.notes && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm">{inbound.notes}</p>
              </div>
            )}

            <Separator />

            {/* Productos recibidos */}
            <div className="space-y-3">
              <h4 className="font-medium">
                Productos recibidos ({inbound.items?.length || 0})
              </h4>
              {(inbound.items || []).map((item) => {
                const product = item.product
                const supplier = product?.supplier
                return (
                  <div
                    key={item.id}
                    className="rounded-md border p-3 space-y-1"
                  >
                    <p className="font-medium">{product?.name || 'Producto'}</p>
                    <p className="text-sm text-muted-foreground">
                      {product?.code || 'N/A'} •{' '}
                      {item.quantity_received}{' '}
                      {getUnitLabel(item.unit_type, item.quantity_received)}
                      {product?.format_ml ? ` (${item.unit_type === 'bottles' ? item.quantity_received * product.format_ml : item.quantity_received}ml)` : ''}
                    </p>
                    {supplier && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                        <Building2 className="h-2.5 w-2.5" />
                        {supplier.name}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Imágenes de factura */}
            {imagePaths.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Imágenes ({imagePaths.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {imageUrls.map((url, idx) => (
                      <button
                        key={idx}
                        className="aspect-square overflow-hidden rounded-md border hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxIndex(idx)}
                      >
                        <img
                          src={url}
                          alt={`Imagen ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/70"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-8 w-8" />
          </button>
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white hover:text-white/70"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}
          <img
            src={imageUrls[lightboxIndex]}
            alt={`Imagen ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-[90vw] rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {lightboxIndex < imageUrls.length - 1 && (
            <button
              className="absolute right-4 text-white hover:text-white/70"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}
          <div className="absolute bottom-4 text-white text-sm">
            {lightboxIndex + 1} / {imageUrls.length}
          </div>
        </div>
      )}
    </>
  )
}
