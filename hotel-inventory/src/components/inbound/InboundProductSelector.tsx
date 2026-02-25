import { useState } from 'react'
import { Search, Plus, Loader2, Building2 } from 'lucide-react'
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
import { useProducts } from '@/hooks/useProducts'
import { useCategories } from '@/hooks/useInventory'
import type { CartItem, Product, UnitType } from '@/types'

interface InboundProductSelectorProps {
  onAddToCart: (item: CartItem) => void
  cartProductIds: Set<string>
}

export function InboundProductSelector({ onAddToCart, cartProductIds }: InboundProductSelectorProps) {
  const { data: products, isLoading, error } = useProducts()
  const { data: categories } = useCategories()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<UnitType>('bottles')

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  }) || []

  const handleAddToCart = () => {
    if (!selectedProduct) return

    onAddToCart({
      product: selectedProduct,
      quantity,
      unit_type: unit,
    })

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
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[160px] shrink-0">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de productos */}
      <div className="h-[300px] overflow-y-auto overflow-x-hidden rounded-md border">
        <div className="p-2">
          {filteredProducts.map((product) => {
            const isSelected = selectedProduct?.id === product.id
            const alreadyInCart = cartProductIds.has(product.id)

            return (
              <div
                key={product.id}
                className={`flex items-center justify-between rounded-md p-2 transition-colors ${
                  alreadyInCart
                    ? 'opacity-40 cursor-not-allowed'
                    : isSelected
                      ? 'bg-primary text-primary-foreground cursor-pointer'
                      : 'hover:bg-accent cursor-pointer'
                }`}
                onClick={() => {
                  if (!alreadyInCart) setSelectedProduct(product)
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
                      {product.category?.name || 'Sin categoría'}
                    </Badge>
                    {product.supplier && (
                      <Badge
                        variant={isSelected ? 'secondary' : 'outline'}
                        className="text-xs flex items-center gap-1"
                      >
                        <Building2 className="h-2.5 w-2.5" />
                        {product.supplier.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="ml-2 shrink-0 text-right">
                  {product.format_ml && (
                    <span className="text-xs opacity-70">{product.format_ml}ml</span>
                  )}
                  {alreadyInCart && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      En carrito
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
      </div>

      {/* Agregar al carrito */}
      {selectedProduct && (
        <div className="rounded-md border p-3 bg-muted/50 space-y-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{selectedProduct.name}</p>
            {selectedProduct.supplier && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Proveedor: {selectedProduct.supplier.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20 shrink-0"
            />
            <Select value={unit} onValueChange={(v) => setUnit(v as UnitType)}>
              <SelectTrigger className="flex-1 sm:w-[100px]">
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
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
