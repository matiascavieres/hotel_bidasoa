import { PackagePlus, FileText, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Inbound } from '@/types'

interface InboundListProps {
  inbounds: Inbound[]
  onSelect: (inbound: Inbound) => void
}

export function InboundList({ inbounds, onSelect }: InboundListProps) {
  if (inbounds.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <PackagePlus className="mx-auto mb-3 h-10 w-10 opacity-30" />
        <p>No hay ingresos registrados</p>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getItemsSummary = (items: Inbound['items']) => {
    if (!items || items.length === 0) return 'Sin productos'
    const shown = items.slice(0, 2).map((i) => i.product?.name || 'Producto')
    const rest = items.length - 2
    return rest > 0 ? `${shown.join(', ')} +${rest} más` : shown.join(', ')
  }

  return (
    <div className="space-y-3">
      {inbounds.map((inbound) => {
        const creatorName = (inbound.creator as { full_name: string } | null | undefined)?.full_name || 'Usuario'
        const itemCount = inbound.items?.length || 0

        return (
          <div
            key={inbound.id}
            className="flex cursor-pointer items-start justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
            onClick={() => onSelect(inbound)}
          >
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  Ingreso {new Date(inbound.received_at).toLocaleDateString('es-CL', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
                <Badge variant="success">Recibido</Badge>
                {inbound.invoice_number && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <FileText className="h-2.5 w-2.5" />
                    Factura {inbound.invoice_number}
                  </Badge>
                )}
                {inbound.image_urls && inbound.image_urls.length > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <ImageIcon className="h-2.5 w-2.5" />
                    {inbound.image_urls.length} {inbound.image_urls.length === 1 ? 'imagen' : 'imágenes'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Registrado por {creatorName} • {formatDate(inbound.received_at)}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
                {itemCount > 0 ? `: ${getItemsSummary(inbound.items)}` : ''}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="ml-2 shrink-0">
              Ver
            </Button>
          </div>
        )
      })}
    </div>
  )
}
