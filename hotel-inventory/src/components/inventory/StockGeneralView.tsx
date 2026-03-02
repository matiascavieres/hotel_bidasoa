import { Fragment, useMemo, useState } from 'react'
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MultiSelect } from '@/components/ui/multi-select'
import { StockIndicator } from './StockIndicator'
import { useInventory, useProducts } from '@/hooks/useInventory'
import { LOCATION_NAMES, type LocationType } from '@/types'

interface StockGeneralViewProps {
  searchQuery: string
}

type SortField = 'name' | 'category' | 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
type SortDirection = 'asc' | 'desc'

const LOCATIONS: LocationType[] = ['bodega', 'bar_casa_sanz', 'bar_hotel_bidasoa']

interface ProductRow {
  id: string
  code: string
  name: string
  category: string
  format_ml: number
  stock: Record<LocationType, { quantity_ml: number; min_stock_ml: number }>
}

export function StockGeneralView({ searchQuery }: StockGeneralViewProps) {
  const { data: allInventory, isLoading: invLoading } = useInventory(undefined)
  const { data: products, isLoading: prodLoading } = useProducts()

  const [sortField, setSortField] = useState<SortField>('category')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const isLoading = invLoading || prodLoading

  // Build product rows with stock per location
  const productRows = useMemo(() => {
    if (!products || !allInventory) return []

    // Create a map of product_id -> location -> inventory data
    const inventoryMap = new Map<string, Map<LocationType, { quantity_ml: number; min_stock_ml: number }>>()
    for (const item of allInventory) {
      if (!item.product_id) continue
      if (!inventoryMap.has(item.product_id)) {
        inventoryMap.set(item.product_id, new Map())
      }
      inventoryMap.get(item.product_id)!.set(item.location as LocationType, {
        quantity_ml: item.quantity_ml,
        min_stock_ml: item.min_stock_ml ?? 0,
      })
    }

    return products.map((product): ProductRow => {
      const invMap = inventoryMap.get(product.id) || new Map()
      const stock: Record<string, { quantity_ml: number; min_stock_ml: number }> = {}
      for (const loc of LOCATIONS) {
        stock[loc] = invMap.get(loc) || { quantity_ml: 0, min_stock_ml: 0 }
      }

      return {
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category?.name || 'Sin categoria',
        format_ml: product.format_ml || 750,
        stock: stock as Record<LocationType, { quantity_ml: number; min_stock_ml: number }>,
      }
    })
  }, [products, allInventory])

  // Unique categories
  const allCategories = useMemo(() => {
    return [...new Set(productRows.map(p => p.category))].sort()
  }, [productRows])

  // Filter
  const filteredRows = useMemo(() => {
    return productRows.filter(row => {
      const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(row.category)
      return matchesSearch && matchesCategory
    })
  }, [productRows, searchQuery, selectedCategories])

  // Sort
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const mod = sortDirection === 'asc' ? 1 : -1
      switch (sortField) {
        case 'name':
          return a.name.localeCompare(b.name) * mod
        case 'category':
          return (a.category.localeCompare(b.category) || a.name.localeCompare(b.name)) * mod
        case 'bodega':
          return (a.stock.bodega.quantity_ml - b.stock.bodega.quantity_ml) * mod
        case 'bar_casa_sanz':
          return (a.stock.bar_casa_sanz.quantity_ml - b.stock.bar_casa_sanz.quantity_ml) * mod
        case 'bar_hotel_bidasoa':
          return (a.stock.bar_hotel_bidasoa.quantity_ml - b.stock.bar_hotel_bidasoa.quantity_ml) * mod
        default:
          return 0
      }
    })
  }, [filteredRows, sortField, sortDirection])

  // Group by category for display
  const groupedRows = useMemo(() => {
    if (sortField !== 'category') return null

    const groups: Record<string, ProductRow[]> = {}
    for (const row of sortedRows) {
      if (!groups[row.category]) {
        groups[row.category] = []
      }
      groups[row.category].push(row)
    }
    return groups
  }, [sortedRows, sortField])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'name' || field === 'category' ? 'asc' : 'desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
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

  const renderStockCell = (row: ProductRow, location: LocationType) => {
    const { quantity_ml, min_stock_ml } = row.stock[location]
    return (
      <td key={location} className="px-2 py-2 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-medium text-sm">
            {getBottles(quantity_ml, row.format_ml)}
          </span>
          <StockIndicator current={quantity_ml} minimum={min_stock_ml} />
        </div>
      </td>
    )
  }

  const renderTableRow = (row: ProductRow, index: number) => (
    <tr key={row.id} className="border-b hover:bg-muted/30">
      <td className="px-2 py-2 text-center text-xs text-muted-foreground tabular-nums">
        {index}
      </td>
      <td className="px-2 py-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{row.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {row.code} • {row.format_ml}ml
          </p>
        </div>
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        <Badge variant="outline" className="text-xs">{row.category}</Badge>
      </td>
      {LOCATIONS.map(loc => renderStockCell(row, loc))}
    </tr>
  )

  return (
    <>
      {/* Category filter */}
      <div className="flex items-center gap-2 mb-3">
        <MultiSelect
          options={allCategories}
          selected={selectedCategories}
          onChange={setSelectedCategories}
          placeholder="Todas las categorías"
          searchPlaceholder="Buscar categoría..."
          countLabel="categorías"
          className="w-[220px]"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full">
          <colgroup>
            <col className="w-[4%]" />
            <col className="w-[25%]" />
            <col className="w-[12%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-muted">
              <th className="px-2 py-2 text-center text-sm font-medium text-muted-foreground">
                #
              </th>
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
              {LOCATIONS.map(loc => (
                <th
                  key={loc}
                  className="px-2 py-2 text-center text-sm font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort(loc as SortField)}
                >
                  <span className="inline-flex items-center justify-center">
                    {LOCATION_NAMES[loc]}
                    <SortIcon field={loc as SortField} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedRows ? (
              // Grouped by category
              Object.entries(groupedRows).map(([category, rows]) => (
                <Fragment key={`group-${category}`}>
                  <tr className="bg-muted/30">
                    <td
                      colSpan={3 + LOCATIONS.length}
                      className="px-2 py-1.5 text-sm font-semibold"
                    >
                      {category}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({rows.length})
                      </span>
                    </td>
                  </tr>
                  {rows.map((row, idx) => renderTableRow(row, idx + 1))}
                </Fragment>
              ))
            ) : (
              sortedRows.map((row, idx) => renderTableRow(row, idx + 1))
            )}
          </tbody>
        </table>
      </div>

      {sortedRows.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          No se encontraron productos
        </div>
      )}
    </>
  )
}
