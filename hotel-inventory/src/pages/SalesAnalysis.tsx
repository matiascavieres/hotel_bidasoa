import { useState, useMemo } from 'react'
import { Download, Search, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SalesTable } from '@/components/sales/SalesTable'
import { useSalesData, useSalesGrupos } from '@/hooks/useSalesData'
import { useToast } from '@/hooks/use-toast'

export default function SalesAnalysis() {
  const { toast } = useToast()
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [periodo, setPeriodo] = useState<'total' | '2024' | '2025'>('total')

  const { data: salesData, isLoading, error } = useSalesData({
    grupos: selectedGrupos.length > 0 ? selectedGrupos : undefined,
    searchQuery: searchQuery || undefined,
  })
  const { data: grupos } = useSalesGrupos()

  const stats = useMemo(() => {
    if (!salesData) return { count: 0, totalVentas: 0, avgDaily: 0 }

    const totalVentas = salesData.reduce((sum, item) => {
      switch (periodo) {
        case '2024': return sum + item.cantidad_2024
        case '2025': return sum + item.cantidad_2025
        default: return sum + item.total
      }
    }, 0)

    const avgDaily = salesData.reduce((sum, item) => sum + item.daily_avg, 0)

    return {
      count: salesData.length,
      totalVentas,
      avgDaily,
    }
  }, [salesData, periodo])

  const handleExport = () => {
    if (!salesData || salesData.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay registros para exportar.',
        variant: 'destructive',
      })
      return
    }

    try {
      const headers = ['#', 'Receta', 'Grupo', 'Familia', 'Cant. 2024', 'Cant. 2025', 'Total', 'Promedio/Dia']
      const rows = salesData.map((item, i) => [
        i + 1,
        `"${item.receta.replace(/"/g, '""')}"`,
        `"${item.grupo}"`,
        `"${item.familia}"`,
        item.cantidad_2024,
        item.cantidad_2025,
        item.total,
        item.daily_avg.toFixed(2),
      ])

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ventas_${periodo}_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: 'Exportado',
        description: `Se exportaron ${salesData.length} registros a CSV.`,
      })
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo exportar los datos.',
        variant: 'destructive',
      })
    }
  }

  const toggleGrupo = (g: string) => {
    setSelectedGrupos(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  const hasActiveFilters = selectedGrupos.length > 0 || searchQuery || periodo !== 'total'

  const handleClearFilters = () => {
    setSelectedGrupos([])
    setSearchQuery('')
    setPeriodo('total')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analisis de Ventas</h1>
          <p className="text-muted-foreground">
            Datos de ventas Casa Sanz 2024-2025
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters Row 1: Period + Search */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as 'total' | '2024' | '2025')}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="total">Total</SelectItem>
            <SelectItem value="2024">Solo 2024</SelectItem>
            <SelectItem value="2025">Solo 2025</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar receta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={handleClearFilters} className="shrink-0">
            Limpiar
          </Button>
        )}
      </div>

      {/* Filters Row 2: Group Chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-muted-foreground font-medium mr-1">Grupo:</span>
        <Badge
          variant={selectedGrupos.length === 0 ? 'default' : 'outline'}
          className="cursor-pointer select-none"
          onClick={() => setSelectedGrupos([])}
        >
          Todos
        </Badge>
        {grupos?.map((g) => (
          <Badge
            key={g}
            variant={selectedGrupos.includes(g) ? 'default' : 'outline'}
            className="cursor-pointer select-none"
            onClick={() => toggleGrupo(g)}
          >
            {g}
          </Badge>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-2 grid-cols-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground truncate">Productos</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums">{stats.count.toLocaleString('es-CL')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground truncate">
              Total Ventas {periodo !== 'total' ? periodo : ''}
            </p>
            <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums">{stats.totalVentas.toLocaleString('es-CL')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground truncate">Prom. Diario</p>
            <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums">{stats.avgDaily.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <SalesTable
        data={salesData || []}
        isLoading={isLoading}
        error={error}
        periodo={periodo}
      />
    </div>
  )
}
