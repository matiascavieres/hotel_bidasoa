import { useState, useMemo } from 'react'
import {
  Download, Search, X,
  TrendingUp, Package, BarChart2,
  ArrowUpIcon, ArrowDownIcon,
  ChevronDownIcon, ChevronUpIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SalesTable } from '@/components/sales/SalesTable'
import { SalesPieChart } from '@/components/sales/SalesPieChart'
import { SalesFamiliaChart } from '@/components/sales/SalesFamiliaChart'
import { MultiSelect } from '@/components/ui/multi-select'
import { useSalesData, useSalesGrupos } from '@/hooks/useSalesData'
import { useToast } from '@/hooks/use-toast'
import type { SalesData } from '@/types'

// Helper estable — no depende de estado, no necesita ir en deps de useMemo
function getCantidad(item: SalesData, periodo: string): number {
  if (periodo === '2024') return item.cantidad_2024
  if (periodo === '2025') return item.cantidad_2025
  return item.total
}

const RANK_COLORS = [
  'bg-yellow-500 text-yellow-950',
  'bg-zinc-400 text-zinc-950',
  'bg-orange-500 text-orange-950',
]

export default function SalesAnalysis() {
  const { toast } = useToast()
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [periodo, setPeriodo] = useState<'total' | '2024' | '2025'>('total')
  const [showTable, setShowTable] = useState(false)

  const { data: salesData, isLoading, error } = useSalesData({
    grupos: selectedGrupos.length > 0 ? selectedGrupos : undefined,
    searchQuery: searchQuery || undefined,
  })
  const { data: grupos } = useSalesGrupos()

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const data = salesData ?? []
    if (data.length === 0) {
      return { count: 0, totalImporte: 0, totalUnidades: 0, avgDaily: 0, variacion: null as number | null }
    }
    const totalImporte = data.reduce((s, i) => s + i.importe_total, 0)
    const totalUnidades = data.reduce((s, i) => s + getCantidad(i, periodo), 0)
    const avgDaily = data.reduce((s, i) => s + i.daily_avg, 0) / data.length
    const total2024 = data.reduce((s, i) => s + i.cantidad_2024, 0)
    const total2025 = data.reduce((s, i) => s + i.cantidad_2025, 0)
    const variacion = total2024 > 0 ? ((total2025 / total2024) - 1) * 100 : null
    return { count: data.length, totalImporte, totalUnidades, avgDaily, variacion }
  }, [salesData, periodo])

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const data = salesData ?? []

    // Por familia (top 8 por cantidad)
    const familiaMap = new Map<string, { cantidad: number; importe: number }>()
    for (const item of data) {
      const k = item.familia || 'Sin familia'
      const prev = familiaMap.get(k) ?? { cantidad: 0, importe: 0 }
      familiaMap.set(k, {
        cantidad: prev.cantidad + getCantidad(item, periodo),
        importe: prev.importe + item.importe_total,
      })
    }
    const familias = Array.from(familiaMap.entries())
      .map(([name, v]) => ({ name, value: v.cantidad, importe: v.importe }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    // Por grupo por importe (top 8)
    const grupoMap = new Map<string, number>()
    for (const item of data) {
      grupoMap.set(item.grupo, (grupoMap.get(item.grupo) ?? 0) + item.importe_total)
    }
    const grupoImporte = Array.from(grupoMap.entries())
      .map(([name, importe]) => ({ name, value: importe, importe }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    // Top 10 recetas por cantidad del periodo
    const top10 = [...data]
      .sort((a, b) => getCantidad(b, periodo) - getCantidad(a, periodo))
      .slice(0, 10)

    return {
      familias,
      maxFamilia: familias[0]?.value ?? 1,
      grupoImporte,
      maxGrupo: grupoImporte[0]?.value ?? 1,
      top10,
      maxTop10: top10[0] ? getCantidad(top10[0], periodo) : 1,
    }
  }, [salesData, periodo])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const hasActiveFilters = selectedGrupos.length > 0 || searchQuery || periodo !== 'total'

  const handleClearFilters = () => {
    setSelectedGrupos([])
    setSearchQuery('')
    setPeriodo('total')
  }

  const toggleGrupo = (g: string) => {
    if (g === 'Otros') return
    setSelectedGrupos(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  const handleExport = () => {
    if (!salesData || salesData.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay registros para exportar.', variant: 'destructive' })
      return
    }
    try {
      const headers = ['#', 'Receta', 'Grupo', 'Familia', 'Cant. 2024', 'Cant. 2025', 'Total', 'Promedio/Dia', 'Imp. Unitario', 'Imp. Total']
      const rows = salesData.map((item, i) => [
        i + 1,
        `"${item.receta.replace(/"/g, '""')}"`,
        `"${item.grupo}"`,
        `"${item.familia}"`,
        item.cantidad_2024,
        item.cantidad_2025,
        item.total,
        item.daily_avg.toFixed(2),
        item.importe_unitario,
        item.importe_total,
      ])
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ventas_${periodo}_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Exportado', description: `Se exportaron ${salesData.length} registros a CSV.` })
    } catch {
      toast({ title: 'Error', description: 'No se pudo exportar los datos.', variant: 'destructive' })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 min-w-0">

      {/* ── A: Header + Filtros ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold shrink-0">Ventas</h1>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as 'total' | '2024' | '2025')}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Total</SelectItem>
              <SelectItem value="2024">Solo 2024</SelectItem>
              <SelectItem value="2025">Solo 2025</SelectItem>
            </SelectContent>
          </Select>

          <MultiSelect
            options={grupos || []}
            selected={selectedGrupos}
            onChange={setSelectedGrupos}
            placeholder="Todos los grupos"
            className="w-[200px]"
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar receta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[180px]"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" />
            Exportar
          </Button>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* ── B: KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Importe Total */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Importe Total</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums truncate">
              ${stats.totalImporte.toLocaleString('es-CL')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total acumulado</p>
          </CardContent>
        </Card>

        {/* Total Unidades */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Total Unidades</p>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums">
              {stats.totalUnidades.toLocaleString('es-CL')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Período {periodo !== 'total' ? periodo : 'completo'}
            </p>
          </CardContent>
        </Card>

        {/* Promedio Diario */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Prom. Diario</p>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums">
              {stats.avgDaily.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Unid/día promedio</p>
          </CardContent>
        </Card>

        {/* Variación 2025 / 2024 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Variación 25/24</p>
              {stats.variacion !== null && (
                stats.variacion >= 0
                  ? <ArrowUpIcon className="h-4 w-4 text-green-500" />
                  : <ArrowDownIcon className="h-4 w-4 text-red-500" />
              )}
            </div>
            {stats.variacion !== null ? (
              <p className={`text-xl font-bold tabular-nums ${stats.variacion >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.variacion >= 0 ? '+' : ''}{stats.variacion.toFixed(1)}%
              </p>
            ) : (
              <p className="text-xl font-bold text-muted-foreground">—</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">Crecimiento interanual</p>
          </CardContent>
        </Card>
      </div>

      {/* ── C: Gráficos — Donut + Familia ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Donut por Grupo */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">
              Distribución por Grupo
              {periodo !== 'total' && (
                <span className="text-muted-foreground font-normal text-sm ml-2">({periodo})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <SalesPieChart
              data={salesData ?? []}
              periodo={periodo}
              onSliceClick={toggleGrupo}
              centerLabel={stats.totalUnidades}
            />
          </CardContent>
        </Card>

        {/* Por Familia */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">
              Por Familia
              <span className="text-muted-foreground font-normal text-xs ml-2">(unidades)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <SalesFamiliaChart
              data={chartData.familias}
              maxValue={chartData.maxFamilia}
              showImporte={false}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── D: Rankings ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 10 Recetas */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">
              Top 10 Recetas
              {periodo !== 'total' && (
                <span className="text-muted-foreground font-normal text-sm ml-2">({periodo})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {chartData.top10.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              chartData.top10.map((item, index) => {
                const qty = getCantidad(item, periodo)
                const barWidth = chartData.maxTop10 > 0 ? (qty / chartData.maxTop10) * 100 : 0
                const rankClass = RANK_COLORS[index] ?? 'bg-muted text-muted-foreground'

                return (
                  <div key={item.id} className="flex items-center gap-2 min-w-0">
                    {/* Rank */}
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${rankClass}`}>
                      {index + 1}
                    </span>

                    {/* Nombre + grupo */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{item.receta}</p>
                      <Badge variant="outline" className="text-[10px] h-4 px-1 mt-0.5">{item.grupo}</Badge>
                    </div>

                    {/* Barra + valor */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-14 bg-muted rounded-full h-1.5 hidden sm:block overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${barWidth}%`,
                            background: 'linear-gradient(to right, #2a5528, #66aa58)',
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-right w-12">
                        {qty.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Top Grupos por Importe */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">
              Top Grupos por Importe
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <SalesFamiliaChart
              data={chartData.grupoImporte}
              maxValue={chartData.maxGrupo}
              showImporte={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── E: Tabla colapsable ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Tabla detallada
              {(salesData?.length ?? 0) > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({salesData!.length} registros)
                </span>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTable(v => !v)}
              className="h-8 w-8 p-0"
            >
              {showTable
                ? <ChevronUpIcon className="h-4 w-4" />
                : <ChevronDownIcon className="h-4 w-4" />
              }
            </Button>
          </div>
        </CardHeader>

        {showTable && (
          <CardContent className="px-4 pb-4 pt-0">
            <SalesTable
              data={salesData ?? []}
              isLoading={isLoading}
              error={error ?? null}
              periodo={periodo}
              totalVentas={stats.totalUnidades}
            />
          </CardContent>
        )}
      </Card>

    </div>
  )
}
