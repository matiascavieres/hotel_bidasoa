import { Fragment, useMemo, useState } from 'react'
import { Loader2, Check, X, PackagePlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MultiSelect } from '@/components/ui/multi-select'
import { useProducts, useCreateMissingInventory } from '@/hooks/useInventory'
import { useInventory } from '@/hooks/useInventory'
import { useToast } from '@/hooks/use-toast'
import { LOCATION_NAMES, type LocationType } from '@/types'

const LOCATIONS: LocationType[] = ['bodega', 'bar_casa_sanz', 'bar_hotel_bidasoa']

interface CoverageRow {
  id: string
  code: string
  name: string
  category: string
  hasInventory: Record<LocationType, boolean>
  missingCount: number
}

export function CatalogStockCoverage() {
  const { data: products, isLoading: prodLoading } = useProducts()
  const { data: allInventory, isLoading: invLoading } = useInventory(undefined)
  const createMissing = useCreateMissingInventory()
  const { toast } = useToast()

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [onlyMissing, setOnlyMissing] = useState(false)

  const isLoading = prodLoading || invLoading

  // Build coverage data
  const coverageRows = useMemo(() => {
    if (!products || !allInventory) return []

    // Set of "productId:location" that exist in inventory
    const inventorySet = new Set<string>()
    for (const item of allInventory) {
      if (item.product_id) {
        inventorySet.add(`${item.product_id}:${item.location}`)
      }
    }

    return products.map((product): CoverageRow => {
      const hasInventory: Record<string, boolean> = {}
      let missingCount = 0
      for (const loc of LOCATIONS) {
        const exists = inventorySet.has(`${product.id}:${loc}`)
        hasInventory[loc] = exists
        if (!exists) missingCount++
      }

      return {
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category?.name || 'Sin categoria',
        hasInventory: hasInventory as Record<LocationType, boolean>,
        missingCount,
      }
    })
  }, [products, allInventory])

  // Stats
  const stats = useMemo(() => {
    const total = coverageRows.length
    const fullyTracked = coverageRows.filter(r => r.missingCount === 0).length
    const untracked = coverageRows.filter(r => r.missingCount === LOCATIONS.length).length
    const partial = total - fullyTracked - untracked
    return { total, fullyTracked, partial, untracked, missingAny: total - fullyTracked }
  }, [coverageRows])

  // Categories
  const allCategories = useMemo(() => {
    return [...new Set(coverageRows.map(r => r.category))].sort()
  }, [coverageRows])

  // Filter
  const filteredRows = useMemo(() => {
    return coverageRows.filter(row => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(row.category)
      const matchesMissing = !onlyMissing || row.missingCount > 0
      return matchesCategory && matchesMissing
    })
  }, [coverageRows, selectedCategories, onlyMissing])

  // Group by category
  const groupedRows = useMemo(() => {
    const groups: Record<string, CoverageRow[]> = {}
    for (const row of filteredRows) {
      if (!groups[row.category]) groups[row.category] = []
      groups[row.category].push(row)
    }
    return groups
  }, [filteredRows])

  // Collect all missing items for bulk action
  const allMissingItems = useMemo(() => {
    const items: Array<{ product_id: string; location: LocationType }> = []
    for (const row of filteredRows) {
      for (const loc of LOCATIONS) {
        if (!row.hasInventory[loc]) {
          items.push({ product_id: row.id, location: loc })
        }
      }
    }
    return items
  }, [filteredRows])

  const handleCreateMissing = () => {
    if (allMissingItems.length === 0) return

    createMissing.mutate(allMissingItems, {
      onSuccess: (data) => {
        toast({
          title: 'Inventario creado',
          description: `${data?.length || allMissingItems.length} registros de inventario creados con stock 0`,
        })
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message || 'No se pudieron crear los registros',
          variant: 'destructive',
        })
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Productos en catalogo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.fullyTracked}</p>
            <p className="text-xs text-muted-foreground">Con inventario completo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.missingAny}</p>
            <p className="text-xs text-muted-foreground">Sin inventario completo</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + action */}
      <div className="flex items-center gap-2 flex-wrap">
        <MultiSelect
          options={allCategories}
          selected={selectedCategories}
          onChange={setSelectedCategories}
          placeholder="Todas las categorias"
          searchPlaceholder="Buscar categoria..."
          countLabel="categorias"
          className="w-[220px]"
        />
        <Button
          variant={onlyMissing ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setOnlyMissing(v => !v)}
        >
          Solo sin inventario
        </Button>

        {allMissingItems.length > 0 && (
          <Button
            size="sm"
            onClick={handleCreateMissing}
            disabled={createMissing.isPending}
            className="ml-auto"
          >
            {createMissing.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PackagePlus className="mr-2 h-4 w-4" />
            )}
            Crear {allMissingItems.length} registros faltantes
          </Button>
        )}
      </div>

      {/* Coverage table */}
      <div className="rounded-md border overflow-auto max-h-[calc(100vh-380px)]">
        <table className="w-full">
          <colgroup>
            <col className="w-[4%]" />
            <col className="w-[30%]" />
            <col className="w-[14%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-muted">
              <th className="px-2 py-2 text-center text-sm font-medium text-muted-foreground">#</th>
              <th className="px-2 py-2 text-left text-sm font-medium">Producto</th>
              <th className="px-2 py-2 text-left text-sm font-medium">Categoria</th>
              {LOCATIONS.map(loc => (
                <th key={loc} className="px-2 py-2 text-center text-sm font-medium">
                  {LOCATION_NAMES[loc]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedRows).map(([category, rows]) => (
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
                {rows.map((row, idx) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30">
                    <td className="px-2 py-2 text-center text-xs text-muted-foreground tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-2">
                      <p className="font-medium text-sm truncate">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.code}</p>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">{row.category}</Badge>
                    </td>
                    {LOCATIONS.map(loc => (
                      <td key={loc} className="px-2 py-2 text-center">
                        {row.hasInventory[loc] ? (
                          <Check className="mx-auto h-4 w-4 text-green-600" />
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <X className="mr-0.5 h-3 w-3" />
                            Falta
                          </Badge>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          {onlyMissing
            ? 'Todos los productos tienen inventario en todas las ubicaciones'
            : 'No se encontraron productos'}
        </div>
      )}
    </div>
  )
}
