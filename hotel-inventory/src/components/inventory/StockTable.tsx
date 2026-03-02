import { useState, useMemo } from 'react'
import { Plus, Edit2, Loader2, ArrowUpDown, ArrowUp, ArrowDown, LayoutList, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StockIndicator } from './StockIndicator'
import { EditQuantityModal } from './EditQuantityModal'
import { useAuth } from '@/context/AuthContext'
import { useInventory } from '@/hooks/useInventory'
import { useInventoryMode } from '@/hooks/useAppSettings'
import { canManageInventory } from '@/lib/auth'
import type { LocationType } from '@/types'

interface StockTableProps {
  location: LocationType
  searchQuery: string
  initialStatus?: string
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
    category_id: string
    sale_price: number | null
    category?: { id: string; name: string } | null
  } | null
}

interface EditingProduct {
  id: string
  code: string
  name: string
  category: string
  category_id: string
  format_ml: number
  quantity_ml: number
  min_stock_ml: number
  sale_price: number | null
}

type StockSortField = 'name' | 'category' | 'quantity_ml' | 'status'
type SortDirection = 'asc' | 'desc'
type ViewMode = 'list' | 'grid'

const getEstado = (product: EditingProduct): string => {
  if (product.quantity_ml === 0) return 'Sin Stock'
  if (product.min_stock_ml > 0 && product.quantity_ml < product.min_stock_ml) return 'Stock Bajo'
  return 'OK'
}

const getStatusOrder = (product: EditingProduct): number => {
  if (product.quantity_ml === 0) return 0
  if (product.min_stock_ml > 0 && product.quantity_ml < product.min_stock_ml) return 1
  return 2
}

export function StockTable({
  location,
  searchQuery,
  initialStatus,
}: StockTableProps) {
  const { profile } = useAuth()
  const { data: inventory, isLoading, error } = useInventory(location)
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null)
  const [sortField, setSortField] = useState<StockSortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedEstados, setSelectedEstados] = useState<string[]>(
    () => initialStatus ? [initialStatus] : []
  )
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('stock-view-mode') as ViewMode) || 'list'
  })

  const { data: inventoryMode } = useInventoryMode()
  const canEdit = canManageInventory(profile?.role ?? 'bartender', inventoryMode?.enabled, profile?.location, location)

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('stock-view-mode', mode)
  }

  // All products mapped from inventory
  const allProducts = useMemo(() => {
    return (inventory || [])
      .filter((item: InventoryItem) => item.product !== null)
      .map((item: InventoryItem) => ({
        id: item.product!.id,
        code: item.product!.code,
        name: item.product!.name,
        category: item.product!.category?.name || 'Sin categoria',
        category_id: item.product!.category_id || item.product!.category?.id || '',
        format_ml: item.product!.format_ml || 750,
        quantity_ml: item.quantity_ml,
        min_stock_ml: item.min_stock_ml || 0,
        sale_price: item.product!.sale_price ?? null,
      }))
  }, [inventory])

  // Unique categories from current data
  const allCategories = useMemo(() => {
    return [...new Set(allProducts.map((p: EditingProduct) => p.category))].sort()
  }, [allProducts])

  // Filter products
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product: EditingProduct) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategories.length === 0 ||
        selectedCategories.includes(product.category)
      const matchesEstado = selectedEstados.length === 0 ||
        selectedEstados.includes(getEstado(product))
      return matchesSearch && matchesCategory && matchesEstado
    })
  }, [allProducts, searchQuery, selectedCategories, selectedEstados])

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const modifier = sortDirection === 'asc' ? 1 : -1
      switch (sortField) {
        case 'name':
          return a.name.localeCompare(b.name) * modifier
        case 'category':
          return a.category.localeCompare(b.category) * modifier
        case 'quantity_ml':
          return (a.quantity_ml - b.quantity_ml) * modifier
        case 'status':
          return (getStatusOrder(a) - getStatusOrder(b)) * modifier
        default:
          return 0
      }
    })
  }, [filteredProducts, sortField, sortDirection])

  const handleSort = (field: StockSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'name' || field === 'category' ? 'asc' : 'desc')
    }
  }

  const SortIcon = ({ field }: { field: StockSortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
    )
  }

  const toggleEstado = (estado: string) => {
    setSelectedEstados(prev =>
      prev.includes(estado) ? prev.filter(x => x !== estado) : [...prev, estado]
    )
  }

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
      {/* Filter Chips + View Toggle */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="space-y-2 flex-1 min-w-0">
          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground font-medium mr-1">Categoria:</span>
            <Badge
              variant={selectedCategories.length === 0 ? 'default' : 'outline'}
              className="cursor-pointer select-none text-xs"
              onClick={() => setSelectedCategories([])}
            >
              Todas
            </Badge>
            {allCategories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategories.includes(cat) ? 'default' : 'outline'}
                className="cursor-pointer select-none text-xs"
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {/* Estado chips */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground font-medium mr-1">Estado:</span>
            <Badge
              variant={selectedEstados.length === 0 ? 'default' : 'outline'}
              className="cursor-pointer select-none text-xs"
              onClick={() => setSelectedEstados([])}
            >
              Todos
            </Badge>
            {['OK', 'Stock Bajo', 'Sin Stock'].map((estado) => (
              <Badge
                key={estado}
                variant={selectedEstados.includes(estado) ? 'default' : 'outline'}
                className="cursor-pointer select-none text-xs"
                onClick={() => toggleEstado(estado)}
              >
                {estado}
              </Badge>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleViewMode('list')}
            title="Vista lista"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleViewMode('grid')}
            title="Vista cuadrícula"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* List view: table (desktop) + cards (mobile) */}
      {viewMode === 'list' && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="rounded-md border overflow-auto max-h-[calc(100vh-320px)]">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[35%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-muted">
                    <th
                      className="px-2 py-2 text-left text-sm font-medium cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('name')}
                    >
                      <span className="inline-flex items-center">
                        Producto
                        <SortIcon field="name" />
                      </span>
                    </th>
                    <th
                      className="px-2 py-2 text-left text-sm font-medium cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('category')}
                    >
                      <span className="inline-flex items-center">
                        Categoria
                        <SortIcon field="category" />
                      </span>
                    </th>
                    <th
                      className="px-2 py-2 text-right text-sm font-medium cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('quantity_ml')}
                    >
                      <span className="inline-flex items-center justify-end">
                        Stock
                        <SortIcon field="quantity_ml" />
                      </span>
                    </th>
                    <th
                      className="px-2 py-2 text-center text-sm font-medium cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('status')}
                    >
                      <span className="inline-flex items-center">
                        Estado
                        <SortIcon field="status" />
                      </span>
                    </th>
                    <th className="px-2 py-2 text-right text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.map((product: EditingProduct) => (
                    <tr key={product.id} className="border-b hover:bg-muted/30">
                      <td className="px-2 py-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {product.code} • {product.format_ml}ml
                          </p>
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <Badge variant="outline">{product.category}</Badge>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div>
                          <p className="font-medium">
                            {getBottles(product.quantity_ml, product.format_ml)} bot.
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {product.quantity_ml} ml
                          </p>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <StockIndicator
                          current={product.quantity_ml}
                          minimum={product.min_stock_ml}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex justify-end gap-1">
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
            {sortedProducts.map((product: EditingProduct) => (
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
        </>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedProducts.map((product: EditingProduct) => (
            <Card key={product.id} className="flex flex-col">
              <CardContent className="p-3 flex flex-col gap-2 h-full">
                {/* Name + status */}
                <div className="flex items-start justify-between gap-1">
                  <p className="font-medium text-sm leading-tight line-clamp-2 flex-1">
                    {product.name}
                  </p>
                  <StockIndicator
                    current={product.quantity_ml}
                    minimum={product.min_stock_ml}
                  />
                </div>
                {/* Code · format */}
                <p className="text-xs text-muted-foreground">
                  {product.code} · {product.format_ml}ml
                </p>
                {/* Category */}
                <Badge variant="outline" className="text-xs w-fit">
                  {product.category}
                </Badge>
                {/* Stock quantity */}
                <div className="mt-auto pt-2 border-t">
                  <p className="text-base font-bold leading-none">
                    {getBottles(product.quantity_ml, product.format_ml)} bot.
                  </p>
                  <p className="text-xs text-muted-foreground">{product.quantity_ml} ml</p>
                </div>
                {/* Actions */}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">
                    <Plus className="mr-1 h-3 w-3" />
                    Pedir
                  </Button>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingProduct(product)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sortedProducts.length === 0 && (
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
