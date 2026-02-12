import { useState, useMemo } from 'react'
import { Search, Plus, Loader2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProducts } from '@/hooks/useProducts'
import { useInventory } from '@/hooks/useInventory'
import type { CartItem, Product, UnitType } from '@/types'

interface ProductSelectorProps {
  onAddToCart: (item: CartItem) => void
}

export function ProductSelector({ onAddToCart }: ProductSelectorProps) {
  const { data: products, isLoading, error } = useProducts()
  const { data: bodegaInventory } = useInventory('bodega')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<UnitType>('bottles')

  // Mapa de stock de bodega: productId → quantity_ml
  const bodegaStockMap = useMemo(() => {
    const map = new Map<string, number>()
    if (bodegaInventory) {
      for (const inv of bodegaInventory) {
        map.set(inv.product_id, inv.quantity_ml)
      }
    }
    return map
  }, [bodegaInventory])

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const getStockInfo = (product: Product) => {
    const stockMl = bodegaStockMap.get(product.id) ?? 0
    const formatMl = product.format_ml || 750
    const bottles = Math.floor(stockMl / formatMl)
    return { stockMl, bottles, hasStock: stockMl > 0 }
  }

  const selectedStockInfo = selectedProduct ? getStockInfo(selectedProduct) : null

  const handleAddToCart = () => {
    if (!selectedProduct) return

    const { hasStock } = getStockInfo(selectedProduct)
    if (!hasStock) return

    onAddToCart({
      product: selectedProduct,
      quantity,
      unit_type: unit,
    })

    // Reset
    setSelectedProduct(null)
    setQuantity(1)
    setSearchQuery('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive">
        Error al cargar productos: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar producto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Product list */}
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-2">
          {filteredProducts.map((product) => {
            const { stockMl, bottles, hasStock } = getStockInfo(product)
            const isSelected = selectedProduct?.id === product.id

            return (
              <div
                key={product.id}
                className={`flex items-center justify-between rounded-md p-2 transition-colors ${
                  !hasStock
                    ? 'opacity-50 cursor-not-allowed'
                    : isSelected
                      ? 'bg-primary text-primary-foreground cursor-pointer'
                      : 'hover:bg-accent cursor-pointer'
                }`}
                onClick={() => {
                  if (hasStock) setSelectedProduct(product)
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{product.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs opacity-70">{product.code}</span>
                    <Badge
                      variant={isSelected ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {product.category?.name || 'Sin categoria'}
                    </Badge>
                  </div>
                </div>
                <div className="ml-2 flex flex-col items-end gap-1 shrink-0">
                  {product.format_ml && (
                    <span className="text-xs opacity-70">{product.format_ml}ml</span>
                  )}
                  {hasStock ? (
                    <Badge variant="secondary" className="text-xs whitespace-nowrap bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {bottles > 0 ? `${bottles} bot.` : `${stockMl}ml`}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                      Sin stock
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
          {filteredProducts.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">
              No se encontraron productos
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Add to cart section */}
      {selectedProduct && (
        <div className="rounded-md border p-3 bg-muted/50 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{selectedProduct.name}</p>
              {selectedStockInfo && (
                <p className="text-xs text-muted-foreground">
                  Disponible en bodega:{' '}
                  <span className={selectedStockInfo.hasStock ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                    {selectedStockInfo.bottles > 0
                      ? `${selectedStockInfo.bottles} botellas (${selectedStockInfo.stockMl.toLocaleString()}ml)`
                      : selectedStockInfo.stockMl > 0
                        ? `${selectedStockInfo.stockMl.toLocaleString()}ml`
                        : 'Sin stock'}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <Select value={unit} onValueChange={(v) => setUnit(v as UnitType)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottles">Botellas</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="units">Unidades</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={!selectedStockInfo?.hasStock}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {selectedStockInfo && !selectedStockInfo.hasStock && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>No se puede agregar: sin stock en bodega</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
