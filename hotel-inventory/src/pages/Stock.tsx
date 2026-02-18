import { useState } from 'react'
import { Download } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { StockTable } from '@/components/inventory/StockTable'
import { ProductSearch } from '@/components/inventory/ProductSearch'
import { useInventory } from '@/hooks/useInventory'
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

export default function Stock() {
  const { profile } = useAuth()
  const [selectedLocation, setSelectedLocation] = useState<LocationType>(
    profile?.location || 'bodega'
  )
  const [searchQuery, setSearchQuery] = useState('')

  const canViewAllLocations = profile?.role === 'admin' || profile?.role === 'bodeguero'

  const locations: LocationType[] = canViewAllLocations
    ? ['bodega', 'bar_casa_sanz', 'bar_hotel_bidasoa']
    : profile?.location
    ? [profile.location]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock</h1>
          <p className="text-muted-foreground">
            Visualiza y gestiona el inventario por ubicacion
          </p>
        </div>
        <ExportButton location={selectedLocation} />
      </div>

      {/* Search */}
      <ProductSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Location tabs */}
      {canViewAllLocations ? (
        <Tabs
          value={selectedLocation}
          onValueChange={(value) => setSelectedLocation(value as LocationType)}
        >
          <TabsList>
            {locations.map((location) => (
              <TabsTrigger key={location} value={location}>
                {LOCATION_NAMES[location]}
              </TabsTrigger>
            ))}
          </TabsList>
          {locations.map((location) => (
            <TabsContent key={location} value={location}>
              <StockTable
                location={location}
                searchQuery={searchQuery}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <StockTable
          location={selectedLocation}
          searchQuery={searchQuery}
        />
      )}
    </div>
  )
}
