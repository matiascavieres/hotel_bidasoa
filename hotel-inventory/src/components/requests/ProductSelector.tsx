import { useState } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
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
import type { CartItem, Product, UnitType } from '@/types'

interface ProductSelectorProps {
  onAddToCart: (item: CartItem) => void
}

export function ProductSelector({ onAddToCart }: ProductSelectorProps) {
  const { data: products, isLoading, error } = useProducts()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<UnitType>('bottles')

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const handleAddToCart = () => {
    if (!selectedProduct) return

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
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`flex items-center justify-between rounded-md p-2 cursor-pointer transition-colors ${
                selectedProduct?.id === product.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
              onClick={() => setSelectedProduct(product)}
            >
              <div>
                <p className="font-medium">{product.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-70">{product.code}</span>
                  <Badge
                    variant={selectedProduct?.id === product.id ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {product.category?.name || 'Sin categoría'}
                  </Badge>
                </div>
              </div>
              {product.format_ml && (
                <span className="text-sm opacity-70">{product.format_ml}ml</span>
              )}
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">
              No se encontraron productos
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Add to cart section */}
      {selectedProduct && (
        <div className="flex items-center gap-2 rounded-md border p-3 bg-muted/50">
          <div className="flex-1">
            <p className="font-medium text-sm">{selectedProduct.name}</p>
          </div>
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
          <Button size="sm" onClick={handleAddToCart}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
