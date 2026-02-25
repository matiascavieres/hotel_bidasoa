import { Minus, Plus, Trash2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { CartItem } from '@/types'

interface InboundCartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
}

export function InboundCart({ items, onUpdateQuantity, onRemove }: InboundCartProps) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No hay productos en el ingreso
      </div>
    )
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

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.product.id}
          className="rounded-lg border p-3"
        >
          {/* Nombre + eliminar */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-medium truncate">{item.product.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.product.code}
                {item.product.format_ml ? ` • ${item.product.format_ml}ml` : ''}
              </p>
              {item.product.supplier && (
                <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                  <Building2 className="h-2.5 w-2.5" />
                  {item.product.supplier.name}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
              onClick={() => onRemove(item.product.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Controles de cantidad */}
          <div className="flex items-center gap-1 mt-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="flex-1 text-center text-sm">
              {item.quantity} {getUnitLabel(item.unit_type, item.quantity)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
