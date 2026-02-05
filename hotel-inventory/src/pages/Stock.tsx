import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StockTable } from '@/components/inventory/StockTable'
import { ProductSearch } from '@/components/inventory/ProductSearch'
import { LOCATION_NAMES, type LocationType } from '@/types'

export default function Stock() {
  const { profile } = useAuth()
  const [selectedLocation, setSelectedLocation] = useState<LocationType>(
    profile?.location || 'bodega'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  console.log('[Stock] Profile:', profile)
  console.log('[Stock] Selected location:', selectedLocation)

  const canViewAllLocations = profile?.role === 'admin' || profile?.role === 'bodeguero'

  const locations: LocationType[] = canViewAllLocations
    ? ['bodega', 'bar_casa_sanz', 'bar_hotel_bidasoa']
    : profile?.location
    ? [profile.location]
    : []

  console.log('[Stock] Can view all locations:', canViewAllLocations)
  console.log('[Stock] Locations:', locations)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stock</h1>
        <p className="text-muted-foreground">
          Visualiza y gestiona el inventario por ubicacion
        </p>
      </div>

      {/* Search and filters */}
      <ProductSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
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
                categoryFilter={selectedCategory}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <StockTable
          location={selectedLocation}
          searchQuery={searchQuery}
          categoryFilter={selectedCategory}
        />
      )}
    </div>
  )
}
