import { useMemo } from 'react'
import { Package, AlertTriangle, XCircle, TrendingDown, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { useInventory, useProducts } from '@/hooks/useInventory'
import { useTriggeredAlerts } from '@/hooks/useAlertConfigs'
import { LOCATION_NAMES, type LocationType } from '@/types'

export function StockSummary() {
  const { profile } = useAuth()

  // Determine which location to show based on role
  const locationFilter: LocationType | undefined =
    profile?.role === 'bartender' ? profile?.location ?? undefined : undefined

  const { data: inventory, isLoading: inventoryLoading } = useInventory(locationFilter)
  const { data: products, isLoading: productsLoading } = useProducts()
  const { data: triggeredAlerts, isLoading: alertsLoading } = useTriggeredAlerts()

  const isLoading = inventoryLoading || productsLoading || alertsLoading

  // Calculate real statistics from inventory data
  const stats = useMemo(() => {
    if (!inventory || !products) {
      return {
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        alertsCount: 0,
      }
    }

    const totalProducts = products.length

    // Count products with low stock (below min_stock_ml but > 0)
    const lowStockCount = inventory.filter(item => {
      const minStock = item.min_stock_ml ?? 0
      return item.quantity_ml > 0 && minStock > 0 && item.quantity_ml < minStock
    }).length

    // Count products with zero stock
    const outOfStockCount = inventory.filter(item => item.quantity_ml === 0).length

    // Use triggered alerts count from alert_configs table
    const alertsCount = triggeredAlerts?.length ?? 0

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount,
      alertsCount,
    }
  }, [inventory, products, triggeredAlerts])

  const statCards = [
    {
      title: 'Total Productos',
      value: stats.totalProducts.toString(),
      icon: Package,
      description: 'en catálogo',
    },
    {
      title: 'Stock Bajo',
      value: stats.lowStockCount.toString(),
      icon: TrendingDown,
      description: 'productos',
      variant: 'warning' as const,
    },
    {
      title: 'Sin Stock',
      value: stats.outOfStockCount.toString(),
      icon: XCircle,
      description: 'productos',
      variant: 'destructive' as const,
    },
    {
      title: 'Alertas',
      value: stats.alertsCount.toString(),
      icon: AlertTriangle,
      description: 'activas',
      variant: 'warning' as const,
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4">
        {profile?.location && (
          <p className="text-sm text-muted-foreground">
            Ubicación: <span className="font-medium">{LOCATION_NAMES[profile.location]}</span>
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-12 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {profile?.location && (
        <p className="text-sm text-muted-foreground">
          Ubicación: <span className="font-medium">{LOCATION_NAMES[profile.location]}</span>
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon
                className={`h-4 w-4 ${
                  stat.variant === 'destructive'
                    ? 'text-destructive'
                    : stat.variant === 'warning'
                    ? 'text-warning'
                    : 'text-muted-foreground'
                }`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
