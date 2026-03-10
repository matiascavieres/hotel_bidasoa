import { useState, useMemo, useRef, type ReactNode } from 'react'
import {
  Download, Search, X, TrendingUp, Package,
  ChevronDownIcon, ChevronUpIcon, ChevronsUpDown,
  RotateCcw, Pencil, Check, Store, Wine, UtensilsCrossed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { SalesPieChart } from '@/components/sales/SalesPieChart'
import { SalesFamiliaChart } from '@/components/sales/SalesFamiliaChart'
import {
  useSalesMonthly,
  useSalesMonthlyGrupos,
  useSalesMonthlyTotals,
  useUpdateSalesMonthly,
  getPreviousMonth,
  BAR_GRUPOS,
  VINOS_GRUPOS,
} from '@/hooks/useSalesMonthly'
import { useToast } from '@/hooks/use-toast'
import type { FamiliaPreset, SalesData } from '@/types'
import type { SalesMonthlyAgg } from '@/hooks/useSalesMonthly'

// ── Constants ──────────────────────────────────────────────────────────────────

const RANK_COLORS = [
  'bg-yellow-500 text-yellow-950',
  'bg-zinc-400 text-zinc-950',
  'bg-orange-500 text-orange-950',
]

const FAMILIA_PRESET_LABELS: Record<FamiliaPreset, string> = {
  all:    'Todos',
  cocina: 'Cocina',
  bar:    'Bar',
  vinos:  'Vinos',
}

const FAMILIA_PRESET_FILTER: Record<Exclude<FamiliaPreset, 'all'>, string> = {
  cocina: 'Alimentaci',
  bar:    'Bebestibles',
  vinos:  'Bebestibles',
}

// Grupos que aplica cada preset de bebestibles
const PRESET_GRUPOS: Partial<Record<FamiliaPreset, string[]>> = {
  bar:   BAR_GRUPOS,
  vinos: VINOS_GRUPOS,
}

const FAMILIA_PRESET_ICONS: Record<FamiliaPreset, ReactNode> = {
  all:    <Package  className="h-3.5 w-3.5" />,
  cocina: <UtensilsCrossed className="h-3.5 w-3.5" />,
  bar:    <Store    className="h-3.5 w-3.5" />,
  vinos:  <Wine     className="h-3.5 w-3.5" />,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('es-CL') }
function fmtCLP(n: number) { return `$${n.toLocaleString('es-CL')}` }

/** Formats 'YYYY-MM' → 'Febrero 2026' */
function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

// Convert SalesMonthlyAgg to the shape SalesPieChart expects (SalesData[]).
// SalesPieChart groups by `grupo` and uses the `total` field for quantities.
function toChartSalesData(agg: SalesMonthlyAgg[]): SalesData[] {
  return agg.map(a => ({
    id:               a.id,
    receta:           a.receta,
    grupo:            a.grupo,
    familia:          a.familia,
    cantidad_2024:    0,
    cantidad_2025:    0,
    total:            a.cantidad,   // SalesPieChart reads this for periodo='total'
    daily_avg:        0,
    importe_unitario: a.importe_unitario,
    importe_total:    a.importe_total,
    created_at:       a.created_at,
  }))
}

// ── Inline-edit cell ───────────────────────────────────────────────────────────

interface EditState {
  id: string
  field: 'cantidad' | 'importe_unitario'
  value: string
}

// ── KPI Tooltip ────────────────────────────────────────────────────────────────

interface KPITop5TooltipProps {
  items: Array<{ receta: string; importe_total: number }>
  title: string
}

function KPITop5Tooltip({ items, title }: KPITop5TooltipProps) {
  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-md border bg-popover text-popover-foreground shadow-md p-3">
      <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const neto = Math.round(item.importe_total / 1.19)
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
              <span className="flex-1 truncate font-medium">{item.receta}</span>
              <div className="text-right shrink-0">
                <p className="tabular-nums font-semibold">{`$${item.importe_total.toLocaleString('es-CL')}`}</p>
                <p className="tabular-nums text-muted-foreground">{`$${neto.toLocaleString('es-CL')} neto`}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Sort helpers ───────────────────────────────────────────────────────────────

type SortCol = 'receta' | 'cantidad' | 'importe_unitario' | 'importe_total' | 'neto' | 'netoTotal' | 'pctTotal' | 'pctGrupo'

function SortIcon({ col, current, dir }: { col: SortCol; current: SortCol; dir: 'asc' | 'desc' }) {
  if (col !== current) return <ChevronsUpDown className="h-3 w-3 ml-1 text-muted-foreground/50 inline" />
  return dir === 'asc'
    ? <ChevronUpIcon className="h-3 w-3 ml-1 inline" />
    : <ChevronDownIcon className="h-3 w-3 ml-1 inline" />
}

// ── Main Component ─────────────────────────────────────────────────────────────

type HoveredKPI = 'total' | 'cocina' | 'bar' | 'vinos' | null

export default function SalesAnalysis() {
  const { toast } = useToast()
  const prevMonth = getPreviousMonth()

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [fromMonth,       setFromMonth]       = useState(prevMonth)
  const [toMonth,         setToMonth]         = useState(prevMonth)
  const [familiaPreset,   setFamiliaPreset]   = useState<FamiliaPreset>('all')
  const [selectedGrupos,  setSelectedGrupos]  = useState<string[]>([])
  const [searchQuery,     setSearchQuery]     = useState('')
  const [hoveredKPI,      setHoveredKPI]      = useState<HoveredKPI>(null)
  const [sortCol,         setSortCol]         = useState<SortCol>('importe_total')
  const [sortDir,         setSortDir]         = useState<'asc' | 'desc'>('desc')

  // ── Inline edit ──────────────────────────────────────────────────────────────
  const [editState, setEditState] = useState<EditState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const updateMutation = useUpdateSalesMonthly()

  const familiaFilter = familiaPreset !== 'all'
    ? FAMILIA_PRESET_FILTER[familiaPreset]
    : undefined

  // Grupos efectivos: si el preset define grupos propios, los intersectamos con
  // los que el usuario haya seleccionado manualmente (o usamos solo el preset).
  const presetGrupos = familiaPreset !== 'all' ? PRESET_GRUPOS[familiaPreset] : undefined
  const effectiveGrupos = useMemo(() => {
    if (presetGrupos) {
      // Si el usuario también filtra por grupos, intersectamos con el preset
      return selectedGrupos.length > 0
        ? presetGrupos.filter(g => selectedGrupos.includes(g))
        : presetGrupos
    }
    return selectedGrupos.length > 0 ? selectedGrupos : undefined
  }, [presetGrupos, selectedGrupos])

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: salesData, isLoading } = useSalesMonthly({
    fromMonth,
    toMonth,
    familiaFilter,
    grupos:      effectiveGrupos,
    searchQuery: searchQuery || undefined,
  })

  const { data: grupos } = useSalesMonthlyGrupos(fromMonth, toMonth)
  const { data: totals } = useSalesMonthlyTotals(fromMonth, toMonth)

  const data = salesData ?? []

  // ── Chart data ────────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    // By familia (for bar chart on the right)
    const familiaMap = new Map<string, { cantidad: number; importe: number }>()
    for (const item of data) {
      const k = item.familia || 'Sin familia'
      const prev = familiaMap.get(k) ?? { cantidad: 0, importe: 0 }
      familiaMap.set(k, {
        cantidad: prev.cantidad + item.cantidad,
        importe:  prev.importe  + item.importe_total,
      })
    }
    const familias = Array.from(familiaMap.entries())
      .map(([name, v]) => ({ name, value: v.cantidad, importe: v.importe }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    // By grupo for importe (right side ranking) — value=neto, importe=bruto
    const grupoMap = new Map<string, number>()
    for (const item of data) {
      grupoMap.set(item.grupo, (grupoMap.get(item.grupo) ?? 0) + item.importe_total)
    }
    const grupoImporte = Array.from(grupoMap.entries())
      .map(([name, imp]) => ({ name, value: Math.round(imp / 1.19), importe: imp }))
      .sort((a, b) => b.importe - a.importe)
      .slice(0, 8)

    // Top 10 by importe_total
    const top10 = [...data]
      .sort((a, b) => b.importe_total - a.importe_total)
      .slice(0, 10)

    const totalUnits = data.reduce((s, i) => s + i.cantidad, 0)
    const totalImporte = data.reduce((s, i) => s + i.importe_total, 0)
    const totalNeto = Math.round(totalImporte / 1.19)

    // Top 5 per KPI for hover tooltips
    const sortedByImporte = [...data].sort((a, b) => b.importe_total - a.importe_total)
    const top5Total  = sortedByImporte.slice(0, 5)
    const top5Cocina = sortedByImporte.filter(i => i.familia.includes('Alimentaci')).slice(0, 5)
    const top5Bar    = sortedByImporte.filter(i => BAR_GRUPOS.includes(i.grupo)).slice(0, 5)
    const top5Vinos  = sortedByImporte.filter(i => VINOS_GRUPOS.includes(i.grupo)).slice(0, 5)

    // Group totals for % del grupo column
    const grupoTotals = new Map<string, number>()
    for (const item of data) {
      grupoTotals.set(item.grupo, (grupoTotals.get(item.grupo) ?? 0) + item.importe_total)
    }

    // Top 5 per familia and per grupo for bar chart hover tooltips
    const familiaTop5Raw = new Map<string, Array<{ receta: string; importe_total: number }>>()
    const grupoTop5Raw   = new Map<string, Array<{ receta: string; importe_total: number }>>()
    for (const item of data) {
      const fk = item.familia || 'Sin familia'
      const fa = familiaTop5Raw.get(fk) ?? []; fa.push({ receta: item.receta, importe_total: item.importe_total }); familiaTop5Raw.set(fk, fa)
      const ga = grupoTop5Raw.get(item.grupo) ?? []; ga.push({ receta: item.receta, importe_total: item.importe_total }); grupoTop5Raw.set(item.grupo, ga)
    }
    const familiaTop5Map = new Map(Array.from(familiaTop5Raw.entries()).map(([k, v]) => [k, v.sort((a, b) => b.importe_total - a.importe_total).slice(0, 5)]))
    const grupoTop5Map   = new Map(Array.from(grupoTop5Raw.entries()).map(([k, v]) => [k, v.sort((a, b) => b.importe_total - a.importe_total).slice(0, 5)]))

    return {
      familias,
      maxFamilia:  familias[0]?.value ?? 1,
      grupoImporte,
      maxGrupo:    grupoImporte[0]?.value ?? 1,
      top10,
      totalUnits,
      totalImporte,
      totalNeto,
      grupoTotals,
      top5Total,
      top5Cocina,
      top5Bar,
      top5Vinos,
      familiaTop5Map,
      grupoTop5Map,
    }
  }, [data])

  // ── Sorted data ───────────────────────────────────────────────────────────────
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let va: number | string
      let vb: number | string
      switch (sortCol) {
        case 'receta':           va = a.receta; vb = b.receta; break
        case 'cantidad':         va = a.cantidad; vb = b.cantidad; break
        case 'importe_unitario': va = a.importe_unitario; vb = b.importe_unitario; break
        case 'importe_total':    va = a.importe_total; vb = b.importe_total; break
        case 'neto':             va = Math.round(a.importe_unitario / 1.19); vb = Math.round(b.importe_unitario / 1.19); break
        case 'netoTotal':        va = Math.round(a.importe_total / 1.19); vb = Math.round(b.importe_total / 1.19); break
        case 'pctTotal':         va = a.importe_total; vb = b.importe_total; break
        case 'pctGrupo':         va = a.importe_total / (chartData.grupoTotals.get(a.grupo) ?? 1); vb = b.importe_total / (chartData.grupoTotals.get(b.grupo) ?? 1); break
        default:                 va = a.importe_total; vb = b.importe_total
      }
      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb as string, 'es') : (vb as string).localeCompare(va, 'es')
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
  }, [data, sortCol, sortDir, chartData.grupoTotals])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const hasFilters = selectedGrupos.length > 0 || searchQuery || familiaPreset !== 'all'

  const handleResetMonth = () => {
    setFromMonth(prevMonth)
    setToMonth(prevMonth)
    setFamiliaPreset('all')
    setSelectedGrupos([])
    setSearchQuery('')
  }

  // Al cambiar el preset, limpiar grupos seleccionados manualmente
  const handleFamiliaPreset = (preset: FamiliaPreset) => {
    setFamiliaPreset(preset)
    setSelectedGrupos([])
  }

  const toggleGrupo = (g: string) => {
    if (g === 'Otros') return
    setSelectedGrupos(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  // Inline editing
  const isSingleMonth = fromMonth === toMonth

  const startEdit = (id: string, field: EditState['field'], value: number) => {
    setEditState({ id, field, value: String(value) })
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = async () => {
    if (!editState) return
    const numVal = parseInt(editState.value.replace(/\D/g, ''), 10)
    if (isNaN(numVal) || numVal < 0) { setEditState(null); return }

    const item = data.find(d => d.id === editState.id)
    if (!item) { setEditState(null); return }

    const newCantidad         = editState.field === 'cantidad'          ? numVal : item.cantidad
    const newImporteUnitario  = editState.field === 'importe_unitario'  ? numVal : item.importe_unitario

    try {
      await updateMutation.mutateAsync({
        id:               editState.id,
        cantidad:         newCantidad,
        importe_unitario: newImporteUnitario,
      })
      toast({ title: 'Guardado', description: 'Registro actualizado.' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar.', variant: 'destructive' })
    }
    setEditState(null)
  }

  const cancelEdit = () => setEditState(null)

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  // Export
  const handleExport = () => {
    if (!data.length) {
      toast({ title: 'Sin datos', description: 'No hay registros para exportar.', variant: 'destructive' })
      return
    }
    const totalImporte = data.reduce((s, i) => s + i.importe_total, 0)
    const grupoTotalsExport = new Map<string, number>()
    for (const item of data) {
      grupoTotalsExport.set(item.grupo, (grupoTotalsExport.get(item.grupo) ?? 0) + item.importe_total)
    }
    const headers = ['#', 'Receta', 'Grupo', 'Familia', 'Cantidad', 'Imp. Venta', 'Imp. Venta Total', 'Imp. Neto', 'Imp. Neto Total', '% del Total', '% del Grupo']
    const rows = data.map((item, i) => {
      const importeVentaTotal = item.cantidad * item.importe_unitario
      const importeNeto = item.importe_unitario > 0 ? Math.round(item.importe_unitario / 1.19) : 0
      const importeNetoTotal = item.importe_total > 0 ? Math.round(item.importe_total / 1.19) : 0
      const pctTotal = totalImporte > 0 ? ((item.importe_total / totalImporte) * 100).toFixed(1) : '0.0'
      const grupoTotal = grupoTotalsExport.get(item.grupo) ?? 0
      const pctGrupo = grupoTotal > 0 ? ((item.importe_total / grupoTotal) * 100).toFixed(1) : '0.0'
      return [
        i + 1,
        `"${item.receta.replace(/"/g, '""')}"`,
        `"${item.grupo}"`,
        `"${item.familia}"`,
        item.cantidad,
        item.importe_unitario,
        importeVentaTotal,
        importeNeto,
        importeNetoTotal,
        `${pctTotal}%`,
        `${pctGrupo}%`,
      ]
    })
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ventas_${fromMonth}_${toMonth}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exportado', description: `${data.length} registros exportados.` })
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 min-w-0">

      {/* ── A: Header + Filtros ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <h1 className="text-2xl font-bold shrink-0">Ventas</h1>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Desde</Label>
              <Input
                type="month"
                value={fromMonth}
                onChange={e => {
                  setFromMonth(e.target.value)
                  if (e.target.value > toMonth) setToMonth(e.target.value)
                }}
                className="h-9 w-[140px] text-sm"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Hasta</Label>
              <Input
                type="month"
                value={toMonth}
                min={fromMonth}
                onChange={e => setToMonth(e.target.value)}
                className="h-9 w-[140px] text-sm"
              />
            </div>

            {/* Reset to last month */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetMonth}
              title={`Volver a ${formatMonthLabel(prevMonth)}`}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Mes anterior
            </Button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar receta..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 w-[180px]"
              />
            </div>

            {/* Export */}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" />
              Exportar
            </Button>

          </div>
        </div>

      </div>

      {/* ── B: KPI Block unificado ────────────────────────────────────────────── */}
      <div className="relative">
        <Card className="cursor-default">
          <CardContent className="p-0">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">

              {/* Total */}
              <div
                className="p-4 relative"
                onMouseEnter={() => setHoveredKPI('total')}
                onMouseLeave={() => setHoveredKPI(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Importe Total</p>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold tabular-nums truncate">{fmtCLP(totals?.total ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{fmtCLP(Math.round((totals?.total ?? 0) / 1.19))} neto</p>
                {hoveredKPI === 'total' && chartData.top5Total.length > 0 && (
                  <KPITop5Tooltip items={chartData.top5Total} title="Top 5 global" />
                )}
              </div>

              {/* Cocina */}
              <div
                className={`p-4 relative ${familiaPreset === 'cocina' ? 'bg-primary/5' : ''}`}
                onMouseEnter={() => setHoveredKPI('cocina')}
                onMouseLeave={() => setHoveredKPI(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Cocina</p>
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold tabular-nums truncate">{fmtCLP(totals?.cocina ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{fmtCLP(Math.round((totals?.cocina ?? 0) / 1.19))} neto</p>
                {hoveredKPI === 'cocina' && chartData.top5Cocina.length > 0 && (
                  <KPITop5Tooltip items={chartData.top5Cocina} title="Top 5 Cocina" />
                )}
              </div>

              {/* Bar */}
              <div
                className={`p-4 relative ${familiaPreset === 'bar' ? 'bg-primary/5' : ''}`}
                onMouseEnter={() => setHoveredKPI('bar')}
                onMouseLeave={() => setHoveredKPI(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Bar</p>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold tabular-nums truncate">{fmtCLP(totals?.bar ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{fmtCLP(Math.round((totals?.bar ?? 0) / 1.19))} neto</p>
                {hoveredKPI === 'bar' && chartData.top5Bar.length > 0 && (
                  <KPITop5Tooltip items={chartData.top5Bar} title="Top 5 Bar" />
                )}
              </div>

              {/* Vinos */}
              <div
                className={`p-4 relative ${familiaPreset === 'vinos' ? 'bg-primary/5' : ''}`}
                onMouseEnter={() => setHoveredKPI('vinos')}
                onMouseLeave={() => setHoveredKPI(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Vinos</p>
                  <Wine className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold tabular-nums truncate">{fmtCLP(totals?.vinos ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{fmtCLP(Math.round((totals?.vinos ?? 0) / 1.19))} neto</p>
                {hoveredKPI === 'vinos' && chartData.top5Vinos.length > 0 && (
                  <KPITop5Tooltip items={chartData.top5Vinos} title="Top 5 Vinos" />
                )}
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── C+D: Gráficos — Donut | Familia + Top Grupos ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">
              Distribución por Grupo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <SalesPieChart
              data={toChartSalesData(data)}
              periodo="total"
              onSliceClick={toggleGrupo}
              centerLabel={chartData.totalNeto}
              centerSubLabel="total neto"
              useImporte={true}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="px-4 pt-4 pb-4 flex flex-col gap-4">
            <div>
              <p className="text-base font-semibold mb-2">
                Por Familia
                <span className="text-muted-foreground font-normal text-xs ml-2">(unidades)</span>
              </p>
              <SalesFamiliaChart
                data={chartData.familias}
                maxValue={chartData.maxFamilia}
                showImporte={false}
                tooltipData={chartData.familiaTop5Map}
              />
            </div>
            <div className="border-t pt-4">
              <p className="text-base font-semibold mb-2">Top Grupos por Importe</p>
              <SalesFamiliaChart
                data={chartData.grupoImporte}
                maxValue={chartData.maxGrupo}
                showImporte={false}
                tooltipData={chartData.grupoTop5Map}
              />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── E: Filtros de categoría — antes de la tabla ─────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'cocina', 'bar', 'vinos'] as FamiliaPreset[]).map(preset => (
          <Button
            key={preset}
            size="sm"
            variant={familiaPreset === preset ? 'default' : 'outline'}
            onClick={() => handleFamiliaPreset(preset)}
            className="gap-1.5"
          >
            {FAMILIA_PRESET_ICONS[preset]}
            {FAMILIA_PRESET_LABELS[preset]}
          </Button>
        ))}

        <div className="h-6 w-px bg-border mx-1" />

        <MultiSelect
          options={grupos || []}
          selected={selectedGrupos}
          onChange={setSelectedGrupos}
          placeholder="Todos los grupos"
          className="w-[220px]"
        />

        {hasFilters && (
          <Button variant="outline" size="sm" onClick={() => {
            setFamiliaPreset('all')
            setSelectedGrupos([])
            setSearchQuery('')
          }}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {fromMonth === toMonth
            ? formatMonthLabel(fromMonth)
            : `${formatMonthLabel(fromMonth)} – ${formatMonthLabel(toMonth)}`}
        </span>
      </div>

      {/* ── F: Tabla principal — todos los registros ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Recetas
              {data.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({data.length} registros)
                </span>
              )}
            </CardTitle>
            {isSingleMonth && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Pencil className="h-3 w-3" />
                Editable
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando…</p>
          ) : sortedData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos para el período seleccionado.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-muted">
                    <th className="px-2 py-2 text-left w-8 bg-muted">#</th>
                    <th
                      className="px-2 py-2 text-left bg-muted cursor-pointer hover:bg-muted/70 select-none whitespace-nowrap"
                      onClick={() => handleSort('receta')}
                    >
                      Receta <SortIcon col="receta" current={sortCol} dir={sortDir} />
                    </th>
                    <th
                      className="px-2 py-2 text-right bg-muted cursor-pointer hover:bg-muted/70 select-none whitespace-nowrap"
                      onClick={() => handleSort('cantidad')}
                    >
                      Cantidad <SortIcon col="cantidad" current={sortCol} dir={sortDir} />
                    </th>
                    <th
                      className="px-2 py-2 text-right bg-muted cursor-pointer hover:bg-muted/70 select-none whitespace-nowrap"
                      onClick={() => handleSort('importe_unitario')}
                    >
                      Imp. Venta <SortIcon col="importe_unitario" current={sortCol} dir={sortDir} />
                    </th>
                    <th
                      className="px-2 py-2 text-right bg-muted cursor-pointer hover:bg-muted/70 select-none whitespace-nowrap"
                      onClick={() => handleSort('importe_total')}
                    >
                      Imp. Venta Total <SortIcon col="importe_total" current={sortCol} dir={sortDir} />
                    </th>
                    <th
                      className="px-2 py-2 text-right bg-muted cursor-pointer hover:bg-muted/70 select-none whitespace-nowrap"
                      onClick={() => handleSort('neto')}
                    >
                      Imp. Neto <SortIcon col="neto" current={sortCol} dir={sortDir} />
                    </th>
                    <th
                      className="px-2 py-2 text-right bg-muted cursor-pointer hover:bg-muted/70 select-none whitespace-nowrap"
                      onClick={() => handleSort('netoTotal')}
                    >
                      Imp. Neto Total <SortIcon col="netoTotal" current={sortCol} dir={sortDir} />
                    </th>
                    <th
                      className="px-2 py-2 text-right bg-muted cursor-pointer hover:bg-muted/70 select-none whitespace-nowrap"
                      onClick={() => handleSort('pctTotal')}
                    >
                      % Total <SortIcon col="pctTotal" current={sortCol} dir={sortDir} />
                    </th>
                    <th
                      className="px-2 py-2 text-right bg-muted cursor-pointer hover:bg-muted/70 select-none whitespace-nowrap"
                      onClick={() => handleSort('pctGrupo')}
                    >
                      % Grupo <SortIcon col="pctGrupo" current={sortCol} dir={sortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((item, index) => {
                    const rankClass = RANK_COLORS[index] ?? ''
                    const isEditing = isSingleMonth && item.isSingleRecord
                    const editingCantidad = editState?.id === item.id && editState?.field === 'cantidad'
                    const editingUnit     = editState?.id === item.id && editState?.field === 'importe_unitario'
                    const importeVentaTotal = item.cantidad * item.importe_unitario
                    const importeNeto = item.importe_unitario > 0 ? Math.round(item.importe_unitario / 1.19) : 0
                    const importeNetoTotal = item.importe_total > 0 ? Math.round(item.importe_total / 1.19) : 0
                    const pctTotal = chartData.totalImporte > 0
                      ? ((item.importe_total / chartData.totalImporte) * 100).toFixed(1)
                      : '0.0'
                    const grupoTotal = chartData.grupoTotals.get(item.grupo) ?? 0
                    const pctGrupo = grupoTotal > 0
                      ? ((item.importe_total / grupoTotal) * 100).toFixed(1)
                      : '0.0'

                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/30">
                        <td className="px-2 py-1.5">
                          {rankClass ? (
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${rankClass}`}>
                              {index + 1}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{index + 1}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 max-w-[200px]">
                          <p className="font-medium truncate leading-tight">{item.receta}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="outline" className="text-[10px] h-4 px-1">{item.grupo}</Badge>
                            {item.familia && <span className="text-[10px] text-muted-foreground truncate">{item.familia}</span>}
                          </div>
                        </td>

                        {/* Cantidad — editable */}
                        <td
                          className={`px-2 py-1.5 text-right tabular-nums ${isEditing ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                          onClick={() => isEditing && !editingCantidad && startEdit(item.id, 'cantidad', item.cantidad)}
                        >
                          {editingCantidad ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                ref={inputRef}
                                type="number"
                                min={0}
                                value={editState!.value}
                                onChange={e => setEditState(s => s && { ...s, value: e.target.value })}
                                onBlur={commitEdit}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitEdit()
                                  if (e.key === 'Escape') cancelEdit()
                                }}
                                className="w-16 text-right border rounded px-1 py-0 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                              />
                              <Button size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={commitEdit}>
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                            </div>
                          ) : (
                            <span className={`${isEditing ? 'hover:underline hover:text-primary cursor-pointer' : ''}`}>
                              {fmt(item.cantidad)}
                              {isEditing && <Pencil className="inline ml-1 h-2.5 w-2.5 text-muted-foreground" />}
                            </span>
                          )}
                        </td>

                        {/* Imp. Unitario — editable */}
                        <td
                          className={`px-2 py-1.5 text-right tabular-nums ${isEditing ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                          onClick={() => isEditing && !editingUnit && startEdit(item.id, 'importe_unitario', item.importe_unitario)}
                        >
                          {editingUnit ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-xs text-muted-foreground">$</span>
                              <input
                                ref={inputRef}
                                type="number"
                                min={0}
                                value={editState!.value}
                                onChange={e => setEditState(s => s && { ...s, value: e.target.value })}
                                onBlur={commitEdit}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitEdit()
                                  if (e.key === 'Escape') cancelEdit()
                                }}
                                className="w-20 text-right border rounded px-1 py-0 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                              />
                              <Button size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={commitEdit}>
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                            </div>
                          ) : (
                            <span className={`text-muted-foreground ${isEditing ? 'hover:underline hover:text-primary cursor-pointer' : ''}`}>
                              {item.importe_unitario > 0 ? fmtCLP(item.importe_unitario) : '—'}
                              {isEditing && <Pencil className="inline ml-1 h-2.5 w-2.5 text-muted-foreground" />}
                            </span>
                          )}
                        </td>

                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {importeVentaTotal > 0 ? fmtCLP(importeVentaTotal) : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                          {importeNeto > 0 ? fmtCLP(importeNeto) : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
                          {importeNetoTotal > 0 ? fmtCLP(importeNetoTotal) : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground text-xs">
                          {pctTotal}%
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground text-xs">
                          {pctGrupo}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!isSingleMonth && data.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              La edición directa sólo está disponible para un mes específico.
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
