import { useState } from 'react'
import { Plus, Edit2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StockIndicator } from './StockIndicator'
import { EditQuantityModal } from './EditQuantityModal'
import { useAuth } from '@/context/AuthContext'
import { useInventory } from '@/hooks/useInventory'
import type { LocationType } from '@/types'

interface StockTableProps {
  location: LocationType
  searchQuery: string
  categoryFilter: string
}

interface InventoryItem {
  id: string
  product_id: string
  quantity_ml: number
  min_stock_ml: number | null
  product: {
    id: string
    code: string
    name: string
    format_ml: number | null
    category?: { name: string } | null
  } | null
}

interface EditingProduct {
  id: string
  code: string
  name: string
  category: string
  format_ml: number
  quantity_ml: number
  min_stock_ml: number
}

export function StockTable({
  location,
  searchQuery,
  categoryFilter,
}: StockTableProps) {
  const { profile } = useAuth()
  const { data: inventory, isLoading, error, isFetching } = useInventory(location)
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null)

  console.log('[StockTable] Render:', { location, isLoading, isFetching, error, inventoryCount: inventory?.length })

  const canEdit = profile?.role === 'admin' || profile?.role === 'bodeguero'

  // Transform and filter products
  const filteredProducts = (inventory || [])
    .filter((item: InventoryItem) => {
      const hasProduct = item.product !== null
      if (!hasProduct) {
        console.log('[StockTable] Item without product:', item)
      }
      return hasProduct
    })
    .map((item: InventoryItem) => ({
      id: item.product!.id,
      code: item.product!.code,
      name: item.product!.name,
      category: item.product!.category?.name || 'Sin categoría',
      format_ml: item.product!.format_ml || 750,
      quantity_ml: item.quantity_ml,
      min_stock_ml: item.min_stock_ml || 0,
    }))
    .filter((product: EditingProduct) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesCategory =
        categoryFilter === 'all' ||
        product.category.toLowerCase() === categoryFilter.toLowerCase()
      return matchesSearch && matchesCategory
    })

  console.log('[StockTable] Filtered products:', filteredProducts.length)

  const getBottles = (ml: number, formatMl: number) => {
    return (ml / formatMl).toFixed(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive">
        Error al cargar el inventario: {error.message}
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Producto</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Categoria</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Stock</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Estado</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product: EditingProduct) => (
                <tr key={product.id} className="border-b">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.code} • {product.format_ml}ml
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{product.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div>
                      <p className="font-medium">
                        {getBottles(product.quantity_ml, product.format_ml)} bot.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity_ml} ml
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StockIndicator
                      current={product.quantity_ml}
                      minimum={product.min_stock_ml}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline">
                        <Plus className="mr-1 h-3 w-3" />
                        Pedir
                      </Button>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingProduct(product)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {filteredProducts.map((product: EditingProduct) => (
          <Card key={product.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.code} • {product.format_ml}ml
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {product.category}
                  </Badge>
                </div>
                <StockIndicator
                  current={product.quantity_ml}
                  minimum={product.min_stock_ml}
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">
                    {getBottles(product.quantity_ml, product.format_ml)} bot.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {product.quantity_ml} ml
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1 h-3 w-3" />
                    Pedir
                  </Button>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingProduct(product)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          No se encontraron productos
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <EditQuantityModal
          product={editingProduct}
          location={location}
          open={!!editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </>
  )
}
