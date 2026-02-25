import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RequestList } from '@/components/requests/RequestList'
import type { RequestStatus, LocationType } from '@/types'

export default function Requests() {
  const { profile } = useAuth()
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [locationFilter, setLocationFilter] = useState<LocationType | 'all'>('all')

  const isBodeguero = profile?.role === 'bodeguero' || profile?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes</h1>
          <p className="text-muted-foreground">
            {isBodeguero
              ? 'Gestiona las solicitudes de productos'
              : 'Tus solicitudes de productos'}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          {isBodeguero && (
            <Select
              value={locationFilter}
              onValueChange={(v) => setLocationFilter(v as LocationType | 'all')}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todas las ubicaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ubicaciones</SelectItem>
                <SelectItem value="bar_casa_sanz">Bar Casa Sanz</SelectItem>
                <SelectItem value="bar_hotel_bidasoa">Bar Hotel Bidasoa</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Link to="/solicitudes/nueva" className={isBodeguero ? '' : 'w-full sm:w-auto'}>
            <Button className={isBodeguero ? '' : 'w-full sm:w-auto'}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Solicitud
            </Button>
          </Link>
        </div>
      </div>

      {/* Select de estado — solo visible en móvil */}
      <div className="sm:hidden">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as RequestStatus | 'all')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="approved">Aprobadas</SelectItem>
            <SelectItem value="delivered">Entregadas</SelectItem>
            <SelectItem value="rejected">Rechazadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as RequestStatus | 'all')}
      >
        {/* Tabs — solo visibles en sm+ */}
        <TabsList className="hidden sm:flex">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="approved">Aprobadas</TabsTrigger>
          <TabsTrigger value="delivered">Entregadas</TabsTrigger>
          <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          <RequestList
            statusFilter={statusFilter}
            locationFilter={isBodeguero ? locationFilter : undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
