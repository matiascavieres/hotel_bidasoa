import { useState, useMemo, useRef, type ReactNode } from 'react'
import {
  Download, Search, X, TrendingUp, Package,
  ChevronDownIcon, ChevronUpIcon,
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SalesAnalysis() {
  const { toast } = useToast()
  const prevMonth = getPreviousMonth()

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [fromMonth,       setFromMonth]       = useState(prevMonth)
  const [toMonth,         setToMonth]         = useState(prevMonth)
  const [familiaPreset,   setFamiliaPreset]   = useState<FamiliaPreset>('all')
  const [selectedGrupos,  setSelectedGrupos]  = useState<string[]>([])
  const [searchQuery,     setSearchQuery]     = useState('')
  const [showTable,       setShowTable]       = useState(false)

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

    // By grupo for importe (right side ranking)
    const grupoMap = new Map<string, number>()
    for (const item of data) {
      grupoMap.set(item.grupo, (grupoMap.get(item.grupo) ?? 0) + item.importe_total)
    }
    const grupoImporte = Array.from(grupoMap.entries())
      .map(([name, importe]) => ({ name, value: importe, importe }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    // Top 10 by importe_total
    const top10 = [...data]
      .sort((a, b) => b.importe_total - a.importe_total)
      .slice(0, 10)

    const totalUnits = data.reduce((s, i) => s + i.cantidad, 0)

    return {
      familias,
      maxFamilia:  familias[0]?.value ?? 1,
      grupoImporte,
      maxGrupo:    grupoImporte[0]?.value ?? 1,
      top10,
      totalUnits,
    }
  }, [data])

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

  // Export
  const handleExport = () => {
    if (!data.length) {
      toast({ title: 'Sin datos', description: 'No hay registros para exportar.', variant: 'destructive' })
      return
    }
    const headers = ['#', 'Receta', 'Grupo', 'Familia', 'Cantidad', 'Imp. Unitario', 'Imp. Total']
    const rows = data.map((item, i) => [
      i + 1,
      `"${item.receta.replace(/"/g, '""')}"`,
      `"${item.grupo}"`,
      `"${item.familia}"`,
      item.cantidad,
      item.importe_unitario,
      item.importe_total,
    ])
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

            {/* Clear filters */}
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
          </div>
        </div>

        {/* ── Second row: preset buttons + grupo multiselect ────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Familia preset buttons */}
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

          {/* Separator */}
          <div className="h-6 w-px bg-border mx-1" />

          {/* Grupo multiselect */}
          <MultiSelect
            options={grupos || []}
            selected={selectedGrupos}
            onChange={setSelectedGrupos}
            placeholder="Todos los grupos"
            className="w-[220px]"
          />

          {/* Period label */}
          <span className="text-xs text-muted-foreground ml-auto">
            {fromMonth === toMonth
              ? formatMonthLabel(fromMonth)
              : `${formatMonthLabel(fromMonth)} – ${formatMonthLabel(toMonth)}`}
          </span>
        </div>
      </div>

      {/* ── B: KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Total Acumulado */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Importe Total</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums truncate">
              {fmtCLP(totals?.total ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total acumulado</p>
          </CardContent>
        </Card>

        {/* Vendido Cocina */}
        <Card className={familiaPreset === 'cocina' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Cocina</p>
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums truncate">
              {fmtCLP(totals?.cocina ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Alimentación Sanz</p>
          </CardContent>
        </Card>

        {/* Vendido Bar */}
        <Card className={familiaPreset === 'bar' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Bar</p>
              <Store className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums truncate">
              {fmtCLP(totals?.bar ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Bebestibles Bar</p>
          </CardContent>
        </Card>

        {/* Vendido Vinos */}
        <Card className={familiaPreset === 'vinos' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Vinos</p>
              <Wine className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums truncate">
              {fmtCLP(totals?.vinos ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Bebestibles Sanz</p>
          </CardContent>
        </Card>
      </div>

      {/* ── C: Gráficos — Donut + Familia ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <Card className="lg:col-span-2">
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
              centerLabel={chartData.totalUnits}
            />
          </CardContent>
        </Card>

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

      {/* ── D: Top 10 Editable + Top Grupos por Importe ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 10 Recetas — EDITABLE */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Top 10 Recetas
              </CardTitle>
              {isSingleMonth && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Pencil className="h-3 w-3" />
                  Editable
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando…</p>
            ) : chartData.top10.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos para el período</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-2 text-left w-8">#</th>
                      <th className="px-2 py-2 text-left">Receta</th>
                      <th className="px-2 py-2 text-right whitespace-nowrap">Imp. Unit.</th>
                      <th className="px-2 py-2 text-right">Cantidad</th>
                      <th className="px-2 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.top10.map((item, index) => {
                      const rankClass = RANK_COLORS[index] ?? 'bg-muted text-muted-foreground'
                      const isEditing = isSingleMonth && item.isSingleRecord
                      const editingCantidad = editState?.id === item.id && editState?.field === 'cantidad'
                      const editingUnit     = editState?.id === item.id && editState?.field === 'importe_unitario'
                      const computedTotal   = item.cantidad * item.importe_unitario

                      return (
                        <tr key={item.id} className="border-b hover:bg-muted/30">
                          <td className="px-2 py-1.5">
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${rankClass}`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 max-w-[160px]">
                            <p className="font-medium truncate leading-tight">{item.receta}</p>
                            <Badge variant="outline" className="text-[10px] h-4 px-1 mt-0.5">{item.grupo}</Badge>
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
                              <span className={`${isEditing ? 'hover:underline hover:text-primary cursor-pointer' : ''}`}>
                                {item.importe_unitario > 0 ? fmtCLP(item.importe_unitario) : '—'}
                                {isEditing && <Pencil className="inline ml-1 h-2.5 w-2.5 text-muted-foreground" />}
                              </span>
                            )}
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

                          {/* Importe Total — always computed */}
                          <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
                            {computedTotal > 0 ? fmtCLP(computedTotal) : fmtCLP(item.importe_total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!isSingleMonth && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                La edición directa sólo está disponible para un mes específico.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Grupos por Importe */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">Top Grupos por Importe</CardTitle>
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

      {/* ── E: Tabla colapsable ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Tabla detallada
              {data.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({data.length} registros)
                </span>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTable(v => !v)}
              className="h-8 w-8 p-0"
            >
              {showTable ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        {showTable && (
          <CardContent className="px-4 pb-4 pt-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando…</p>
            ) : data.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos para el período seleccionado.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-2 text-left w-8">#</th>
                      <th className="px-2 py-2 text-left">Receta</th>
                      <th className="px-2 py-2 text-left">Grupo</th>
                      <th className="px-2 py-2 text-left">Familia</th>
                      <th className="px-2 py-2 text-right">Cantidad</th>
                      <th className="px-2 py-2 text-right">Imp. Unit.</th>
                      <th className="px-2 py-2 text-right">Imp. Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr key={item.id} className="border-b hover:bg-muted/30">
                        <td className="px-2 py-2 text-muted-foreground">{index + 1}</td>
                        <td className="px-2 py-2 font-medium">{item.receta}</td>
                        <td className="px-2 py-2">
                          <Badge variant="outline">{item.grupo}</Badge>
                        </td>
                        <td className="px-2 py-2 text-muted-foreground text-xs">{item.familia}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(item.cantidad)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                          {item.importe_unitario > 0 ? fmtCLP(item.importe_unitario) : '—'}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums font-semibold">
                          {fmtCLP(item.importe_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

    </div>
  )
}
