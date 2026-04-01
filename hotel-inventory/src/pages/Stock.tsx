import { useState, useTransition } from 'react'
import { Download } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { StockTable } from '@/components/inventory/StockTable'
import { StockGeneralView } from '@/components/inventory/StockGeneralView'
import { ProductSearch } from '@/components/inventory/ProductSearch'
import { useInventory } from '@/hooks/useInventory'
import { useRealtimeInventory } from '@/hooks/useRealtime'
import { LOCATION_NAMES, type LocationType } from '@/types'

function exportStockToCSV(
  inventory: Array<{
    quantity_ml: number
    min_stock_ml: number | null
    product: {
      code: string
      name: string
      format_ml: number | null
      category?: { name: string } | null
    } | null
  }>,
  locationName: string
) {
  const headers = ['Código', 'Producto', 'Categoría', 'Stock (ml)', 'Stock (botellas)', 'Stock Mínimo (ml)', 'Estado']

  const rows = inventory
    .filter((item) => item.product !== null)
    .map((item) => {
      const formatMl = item.product?.format_ml || 750
      const bottles = item.quantity_ml > 0 ? (item.quantity_ml / formatMl).toFixed(2) : '0'
      const status =
        item.quantity_ml === 0
          ? 'Sin Stock'
          : item.min_stock_ml && item.quantity_ml < item.min_stock_ml
          ? 'Stock Bajo'
          : 'OK'
      return [
        item.product?.code || '',
        item.product?.name || '',
        item.product?.category?.name || '',
        item.quantity_ml,
        bottles,
        item.min_stock_ml ?? '',
        status,
      ]
    })

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.setAttribute('href', URL.createObjectURL(blob))
  link.setAttribute('download', `stock_${locationName}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function ExportButton({ location }: { location: LocationType }) {
  const { data: inventory } = useInventory(location)

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportStockToCSV(inventory || [], LOCATION_NAMES[location])}
      disabled={!inventory || inventory.length === 0}
    >
      <Download className="mr-2 h-4 w-4" />
      Exportar CSV
    </Button>
  )
}

type StockTab = 'general' | LocationType

export default function Stock() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()

  // Real-time sync: auto-refresh when any device updates inventory
  useRealtimeInventory()

  const locationParam = searchParams.get('location') as LocationType | null
  const statusParam = searchParams.get('status')

  const validLocations: LocationType[] = ['bodega', 'bar_casa_sanz', 'bar_hotel_bidasoa']

  const [, startTransition] = useTransition()
  const [selectedTab, setSelectedTab] = useState<StockTab>(
    locationParam && validLocations.includes(locationParam)
      ? locationParam
      : 'general'
  )
  const [searchQuery, setSearchQuery] = useState('')

  const canViewAllLocations = profile?.role === 'admin' || profile?.role === 'bodeguero'

  const locations: LocationType[] = canViewAllLocations
    ? ['bodega', 'bar_casa_sanz', 'bar_hotel_bidasoa']
    : profile?.location
    ? [profile.location]
    : []

  // For export button, only show when a specific location is selected
  const selectedLocation = selectedTab !== 'general' ? selectedTab : locations[0] || 'bodega'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock</h1>
          <p className="text-muted-foreground">
            Visualiza y gestiona el inventario por ubicacion
          </p>
        </div>
        {selectedTab !== 'general' && (
          <ExportButton location={selectedLocation} />
        )}
      </div>

      {/* Search */}
      <ProductSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Location tabs */}
      {canViewAllLocations ? (
        <Tabs
          value={selectedTab}
          onValueChange={(value) => startTransition(() => setSelectedTab(value as StockTab))}
        >
          <TabsList>
            <TabsTrigger value="general">
              General
            </TabsTrigger>
            {locations.map((location) => (
              <TabsTrigger key={location} value={location}>
                {LOCATION_NAMES[location]}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="general">
            <StockGeneralView searchQuery={searchQuery} />
          </TabsContent>
          {locations.map((location) => (
            <TabsContent key={location} value={location}>
              <StockTable
                location={location}
                searchQuery={searchQuery}
                initialStatus={location === selectedTab ? (statusParam ?? undefined) : undefined}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <StockTable
          location={selectedLocation}
          searchQuery={searchQuery}
          initialStatus={statusParam ?? undefined}
        />
      )}
    </div>
  )
}
