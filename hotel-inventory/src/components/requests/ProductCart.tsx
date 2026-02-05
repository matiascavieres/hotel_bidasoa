import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CartItem } from '@/types'

interface ProductCartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
}

export function ProductCart({
  items,
  onUpdateQuantity,
  onRemove,
}: ProductCartProps) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No hay productos en el carrito
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
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex-1 space-y-1">
            <p className="font-medium">{item.product.name}</p>
            <p className="text-sm text-muted-foreground">
              {item.product.code} • {item.product.format_ml}ml
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  onUpdateQuantity(item.product.id, item.quantity - 1)
                }
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-16 text-center">
                {item.quantity} {getUnitLabel(item.unit_type, item.quantity)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  onUpdateQuantity(item.product.id, item.quantity + 1)
                }
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onRemove(item.product.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
