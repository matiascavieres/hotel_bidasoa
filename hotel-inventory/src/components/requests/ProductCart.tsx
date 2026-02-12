import { Minus, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CartItem } from '@/types'

interface ProductCartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
  bodegaStock?: Map<string, number>
}

export function ProductCart({
  items,
  onUpdateQuantity,
  onRemove,
  bodegaStock,
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

  const getRequestedMl = (item: CartItem) => {
    const formatMl = item.product.format_ml || 750
    switch (item.unit_type) {
      case 'bottles':
        return item.quantity * formatMl
      case 'ml':
        return item.quantity
      case 'units':
        return item.quantity * formatMl
      default:
        return item.quantity * formatMl
    }
  }

  const getStockStatus = (item: CartItem) => {
    if (!bodegaStock) return null
    const stockMl = bodegaStock.get(item.product.id) ?? 0
    const requestedMl = getRequestedMl(item)
    const formatMl = item.product.format_ml || 750
    const stockBottles = Math.floor(stockMl / formatMl)

    if (stockMl === 0) {
      return { type: 'error' as const, message: 'Sin stock en bodega' }
    }
    if (requestedMl > stockMl) {
      const availLabel = stockBottles > 0
        ? `${stockBottles} bot. (${stockMl.toLocaleString()}ml)`
        : `${stockMl.toLocaleString()}ml`
      return {
        type: 'warning' as const,
        message: `Excede stock en bodega (disponible: ${availLabel})`,
      }
    }
    return null
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const stockStatus = getStockStatus(item)

        return (
          <div
            key={item.product.id}
            className={`rounded-lg border p-3 ${
              stockStatus?.type === 'error'
                ? 'border-destructive/50 bg-destructive/5'
                : stockStatus?.type === 'warning'
                  ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/20'
                  : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-1 min-w-0">
                <p className="font-medium truncate">{item.product.name}</p>
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
                  <span className="w-16 text-center text-sm">
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

            {stockStatus && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${
                stockStatus.type === 'error' ? 'text-destructive' : 'text-orange-600 dark:text-orange-400'
              }`}>
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{stockStatus.message}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
