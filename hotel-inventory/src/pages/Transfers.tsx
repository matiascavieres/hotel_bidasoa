import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TransferConfirm } from '@/components/transfers/TransferConfirm'
import { useTransfers } from '@/hooks/useTransfers'
import { LOCATION_NAMES, TRANSFER_STATUS_CONFIG, type TransferStatus, type LocationType } from '@/types'

export default function Transfers() {
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all')
  const [selectedTransfer, setSelectedTransfer] = useState<string | null>(null)

  const { data: transfers, isLoading, error } = useTransfers(statusFilter)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Traspasos</h1>
          <p className="text-muted-foreground">
            Gestiona traspasos entre ubicaciones
          </p>
        </div>
        <Link to="/traspasos/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Traspaso
          </Button>
        </Link>
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as TransferStatus | 'all')}
      >
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="completed">Completados</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              Error al cargar los traspasos
            </div>
          ) : !transfers || transfers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay traspasos{' '}
              {statusFilter !== 'all'
                ? TRANSFER_STATUS_CONFIG[statusFilter].label.toLowerCase() + 's'
                : ''}
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((transfer) => {
                const creator = transfer.creator as { full_name: string } | null
                const items = (transfer.items || []) as Array<{
                  product: { name: string } | null
                  quantity_ml: number
                }>
                const status = transfer.status as TransferStatus
                const fromLocation = transfer.from_location as LocationType
                const toLocation = transfer.to_location as LocationType

                return (
                  <Card
                    key={transfer.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedTransfer(transfer.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">
                              {LOCATION_NAMES[fromLocation]}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {LOCATION_NAMES[toLocation]}
                            </span>
                            <Badge
                              variant={
                                TRANSFER_STATUS_CONFIG[status].color as
                                  | 'success'
                                  | 'warning'
                              }
                            >
                              {TRANSFER_STATUS_CONFIG[status].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {creator?.full_name || 'Usuario'} •{' '}
                            {formatDate(transfer.created_at)}
                          </p>
                          <p className="text-sm">
                            {items.length} producto
                            {items.length !== 1 ? 's' : ''}:{' '}
                            {items
                              .slice(0, 2)
                              .map((item) => item.product?.name || 'Producto')
                              .join(', ')}
                            {items.length > 2 &&
                              ` +${items.length - 2} más`}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedTransfer && (
        <TransferConfirm
          transferId={selectedTransfer}
          open={!!selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
        />
      )}
    </div>
  )
}
