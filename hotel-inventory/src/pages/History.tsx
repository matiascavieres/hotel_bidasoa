import { useState } from 'react'
import { Download, Filter, LayoutList, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LogTimeline } from '@/components/logs/LogTimeline'
import { LogTable } from '@/components/logs/LogTable'
import { useLogs, exportLogsToCSV, exportApprovedItemsSummary } from '@/hooks/useLogs'
import { useProducts } from '@/hooks/useInventory'
import { useToast } from '@/hooks/use-toast'

const actionTypes = [
  { value: 'all', label: 'Todas las acciones' },
  { value: 'stock_adjustment', label: 'Ajustes de stock' },
  { value: 'request_created', label: 'Solicitudes creadas' },
  { value: 'request_approved', label: 'Solicitudes aprobadas' },
  { value: 'request_delivered', label: 'Solicitudes entregadas' },
  { value: 'transfer_created', label: 'Traspasos creados' },
  { value: 'transfer_completed', label: 'Traspasos completados' },
  { value: 'product_updated', label: 'Productos editados' },
]

type HistoryViewMode = 'timeline' | 'table'

export default function History() {
  const { toast } = useToast()
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<HistoryViewMode>(() => {
    return (localStorage.getItem('history-view-mode') as HistoryViewMode) || 'table'
  })

  // Fetch logs with same filters used by LogTimeline
  const { data: logs } = useLogs({
    action: actionFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  const { data: products } = useProducts()

  const handleViewMode = (mode: HistoryViewMode) => {
    setViewMode(mode)
    localStorage.setItem('history-view-mode', mode)
  }

  const handleExport = () => {
    if (!logs || logs.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay registros para exportar con los filtros actuales.',
        variant: 'destructive',
      })
      return
    }

    try {
      const formattedLogs = logs.map(log => ({
        created_at: log.created_at,
        action: log.action,
        user: log.user as { full_name: string } | undefined,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        location: log.location ?? undefined,
        details: (log.details || {}) as Record<string, unknown>,
      }))

      exportLogsToCSV(formattedLogs)

      toast({
        title: 'Exportado',
        description: `Se exportaron ${logs.length} registros a CSV.`,
      })
    } catch (error) {
      console.error('[History] Export error:', error)
      toast({
        title: 'Error',
        description: 'No se pudo exportar el historial.',
        variant: 'destructive',
      })
    }
  }

  const handleExportResumen = () => {
    if (!logs || logs.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay registros para exportar.', variant: 'destructive' })
      return
    }
    const formattedLogs = logs.map(log => ({
      action: log.action,
      created_at: log.created_at,
      details: (log.details || {}) as Record<string, unknown>,
    }))
    const productsData = (products || []).map(p => ({
      name: p.name,
      sale_price: (p as { sale_price?: number | null }).sale_price ?? null,
    }))
    const exported = exportApprovedItemsSummary(formattedLogs, productsData)
    if (exported) {
      toast({ title: 'Exportado', description: 'Resumen de movimientos aprobados exportado.' })
    } else {
      toast({ title: 'Sin datos', description: 'No hay movimientos aprobados en el período seleccionado.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold">Historial</h1>
          <p className="text-muted-foreground">
            Registro de todas las operaciones del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportResumen}>
            <Download className="mr-2 h-4 w-4" />
            Resumen aprobados
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => handleViewMode('table')}
              title="Vista tabla"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => handleViewMode('timeline')}
              title="Vista timeline"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Tipo de accion</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setActionFilter('all')
                    setDateFrom('')
                    setDateTo('')
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content based on view mode */}
      {viewMode === 'table' ? (
        <LogTable actionFilter={actionFilter} dateFrom={dateFrom} dateTo={dateTo} />
      ) : (
        <LogTimeline actionFilter={actionFilter} dateFrom={dateFrom} dateTo={dateTo} />
      )}
    </div>
  )
}
