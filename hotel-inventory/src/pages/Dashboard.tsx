import { useAuth } from '@/context/AuthContext'
import { StockSummary } from '@/components/dashboard/StockSummary'
import { PendingRequests } from '@/components/dashboard/PendingRequests'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentActivity } from '@/components/dashboard/RecentActivity'

export default function Dashboard() {
  const { profile } = useAuth()
  const role = profile?.role

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Bienvenido, {profile?.full_name?.split(' ')[0] || 'Usuario'}
        </h1>
        <p className="text-muted-foreground">
          Resumen del sistema de inventario
        </p>
      </div>

      {/* Quick Actions - visible to all */}
      <QuickActions />

      {/* Stock Summary */}
      <StockSummary />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Requests - more prominent for bodeguero */}
        {(role === 'admin' || role === 'bodeguero') && (
          <PendingRequests />
        )}

        {/* Recent Activity */}
        <RecentActivity className={role === 'bartender' ? 'md:col-span-2' : ''} />
      </div>
    </div>
  )
}
