import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RequestList } from '@/components/requests/RequestList'
import type { RequestStatus } from '@/types'

export default function Requests() {
  const { profile } = useAuth()
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')

  const isBodeguero = profile?.role === 'bodeguero' || profile?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes</h1>
          <p className="text-muted-foreground">
            {isBodeguero
              ? 'Gestiona las solicitudes de productos'
              : 'Tus solicitudes de productos'}
          </p>
        </div>
        <Link to="/solicitudes/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Solicitud
          </Button>
        </Link>
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as RequestStatus | 'all')}
      >
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="approved">Aprobadas</TabsTrigger>
          <TabsTrigger value="delivered">Entregadas</TabsTrigger>
          <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          <RequestList statusFilter={statusFilter} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
