import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { SalesData } from '@/types'

interface SalesPieChartProps {
  data: SalesData[]
  periodo: 'total' | '2024' | '2025'
  onSliceClick?: (grupo: string) => void
  centerLabel?: string | number
  centerSubLabel?: string
  useImporte?: boolean
}

const COLORS = [
  '#0d1a0c', '#1a3818', '#2a5528', '#3a7238',
  '#4e8f48', '#66aa58', '#80be68', '#9dce7e',
  '#badc96', '#d4e8b0',
]

interface ChartEntry {
  name: string
  value: number   // used for pie sizing (neto when useImporte)
  bruto: number   // original importe_total
  percent: number
}

export function SalesPieChart({ data, periodo, onSliceClick, centerLabel, centerSubLabel = 'uds. totales', useImporte = false }: SalesPieChartProps) {
  const [activeEntry, setActiveEntry] = useState<ChartEntry | null>(null)

  const chartData = useMemo(() => {
    const grupoMap = new Map<string, { value: number; bruto: number }>()

    for (const item of data) {
      const prev = grupoMap.get(item.grupo) ?? { value: 0, bruto: 0 }
      if (useImporte) {
        const imp = item.importe_total
        grupoMap.set(item.grupo, { value: prev.value + Math.round(imp / 1.19), bruto: prev.bruto + imp })
      } else {
        let cantidad: number
        switch (periodo) {
          case '2024': cantidad = item.cantidad_2024; break
          case '2025': cantidad = item.cantidad_2025; break
          default: cantidad = item.total
        }
        grupoMap.set(item.grupo, { value: prev.value + cantidad, bruto: prev.bruto + cantidad })
      }
    }

    const entries = Array.from(grupoMap.entries())
      .map(([name, v]) => ({ name, value: v.value, bruto: v.bruto }))
      .sort((a, b) => b.value - a.value)

    const totalValue = entries.reduce((s, e) => s + e.value, 0)

    let result: ChartEntry[]
    if (entries.length > 10) {
      const top = entries.slice(0, 9)
      const otros = entries.slice(9)
      const otrosValue = otros.reduce((s, e) => s + e.value, 0)
      const otrosBruto = otros.reduce((s, e) => s + e.bruto, 0)
      result = [
        ...top.map(e => ({ ...e, percent: totalValue > 0 ? (e.value / totalValue) * 100 : 0 })),
        { name: 'Otros', value: otrosValue, bruto: otrosBruto, percent: totalValue > 0 ? (otrosValue / totalValue) * 100 : 0 },
      ]
    } else {
      result = entries.map(e => ({
        ...e,
        percent: totalValue > 0 ? (e.value / totalValue) * 100 : 0,
      }))
    }

    return result
  }, [data, periodo, useImporte])

  if (chartData.length === 0) return null

  const displayLabel = centerLabel !== undefined
    ? (typeof centerLabel === 'number' ? centerLabel.toLocaleString('es-CL') : centerLabel)
    : null

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="relative w-full" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={130}
              paddingAngle={2}
              dataKey="value"
              onClick={(entry) => onSliceClick?.(entry.name)}
              onMouseEnter={(entry) => setActiveEntry(entry as ChartEntry)}
              onMouseLeave={() => setActiveEntry(null)}
              className="cursor-pointer"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centro del donut */}
        {displayLabel !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{displayLabel}</p>
              <p className="text-xs text-muted-foreground">{centerSubLabel}</p>
            </div>
          </div>
        )}

        {/* Tooltip fijo en esquina superior derecha — no se superpone al centro */}
        {activeEntry && (
          <div className="absolute top-2 right-2 rounded-md border bg-background/95 shadow-md text-sm p-2.5 pointer-events-none min-w-[140px]">
            <p className="font-semibold mb-1">{activeEntry.name}</p>
            {useImporte ? (
              <>
                <p className="text-muted-foreground">${activeEntry.value.toLocaleString('es-CL')} neto</p>
                <p className="text-muted-foreground text-xs">${activeEntry.bruto.toLocaleString('es-CL')} venta</p>
              </>
            ) : (
              <p className="text-muted-foreground">{activeEntry.value.toLocaleString('es-CL')} uds.</p>
            )}
            <p className="text-muted-foreground font-medium mt-1">{activeEntry.percent.toFixed(1)}%</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
        {chartData.map((entry, index) => (
          <button
            key={entry.name}
            className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
            onClick={() => onSliceClick?.(entry.name)}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-foreground">{entry.name}</span>
            <span className="text-muted-foreground">({entry.percent.toFixed(1)}%)</span>
          </button>
        ))}
      </div>
    </div>
  )
}
