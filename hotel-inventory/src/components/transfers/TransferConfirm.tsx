import { ArrowRight, Check, Loader2 } from 'lucide-react'
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
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useTransfer, useConfirmTransfer } from '@/hooks/useTransfers'
import { LOCATION_NAMES, TRANSFER_STATUS_CONFIG, type TransferStatus } from '@/types'

interface TransferConfirmProps {
  transferId: string
  open: boolean
  onClose: () => void
}

export function TransferConfirm({ transferId, open, onClose }: TransferConfirmProps) {
  const { profile, user } = useAuth()
  const { toast } = useToast()

  // Fetch transfer data
  const { data: transfer, isLoading: transferLoading } = useTransfer(transferId)

  // Mutation
  const confirmTransfer = useConfirmTransfer()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleConfirm = async () => {
    if (!user?.id || !transfer) return

    confirmTransfer.mutate(
      {
        transferId: transfer.id,
        confirmerId: user.id,
        confirmerName: profile?.full_name || 'Usuario',
      },
      {
        onSuccess: () => {
          toast({ title: 'Traspaso confirmado', description: 'El inventario ha sido actualizado' })
          onClose()
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'No se pudo confirmar el traspaso',
            variant: 'destructive',
          })
        },
      }
    )
  }

  if (transferLoading) {
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

  if (!transfer) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>No se pudo cargar el traspaso</DialogDescription>
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

  const creatorName = (transfer.creator as { full_name: string } | null)?.full_name || 'Usuario'
  const status = transfer.status as TransferStatus

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Traspaso #{transfer.id.slice(0, 8)}
            <Badge
              variant={
                TRANSFER_STATUS_CONFIG[status].color as 'success' | 'warning'
              }
            >
              {TRANSFER_STATUS_CONFIG[status].label}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>{LOCATION_NAMES[transfer.from_location]}</span>
            <ArrowRight className="h-4 w-4" />
            <span>{LOCATION_NAMES[transfer.to_location]}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Creado por: {creatorName}</p>
            <p>Fecha: {formatDate(transfer.created_at)}</p>
          </div>

          {transfer.notes && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">{transfer.notes}</p>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Productos</h4>
            {(transfer.items || []).map((item) => {
              const product = item.product as { name: string; code: string } | null
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{product?.name || 'Producto'}</p>
                    <p className="text-sm text-muted-foreground">
                      {product?.code || 'N/A'}
                    </p>
                  </div>
                  <span className="font-medium">{item.quantity_ml}ml</span>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {status === 'pending' && (
            <Button onClick={handleConfirm} disabled={confirmTransfer.isPending}>
              {confirmTransfer.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Confirmar Recepción
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
