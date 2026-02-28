import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { SalesData } from '@/types'

interface SalesPieChartProps {
  data: SalesData[]
  periodo: 'total' | '2024' | '2025'
  onSliceClick?: (grupo: string) => void
  centerLabel?: string | number
}

const COLORS = [
  '#0d1a0c', '#1a3818', '#2a5528', '#3a7238',
  '#4e8f48', '#66aa58', '#80be68', '#9dce7e',
  '#badc96', '#d4e8b0',
]

interface ChartEntry {
  name: string
  value: number
  percent: number
}

export function SalesPieChart({ data, periodo, onSliceClick, centerLabel }: SalesPieChartProps) {
  const chartData = useMemo(() => {
    const grupoMap = new Map<string, number>()

    for (const item of data) {
      let cantidad: number
      switch (periodo) {
        case '2024': cantidad = item.cantidad_2024; break
        case '2025': cantidad = item.cantidad_2025; break
        default: cantidad = item.total
      }
      grupoMap.set(item.grupo, (grupoMap.get(item.grupo) || 0) + cantidad)
    }

    const entries = Array.from(grupoMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const totalValue = entries.reduce((s, e) => s + e.value, 0)

    let result: ChartEntry[]
    if (entries.length > 10) {
      const top = entries.slice(0, 9)
      const otrosValue = entries.slice(9).reduce((s, e) => s + e.value, 0)
      result = [
        ...top.map(e => ({ ...e, percent: totalValue > 0 ? (e.value / totalValue) * 100 : 0 })),
        { name: 'Otros', value: otrosValue, percent: totalValue > 0 ? (otrosValue / totalValue) * 100 : 0 },
      ]
    } else {
      result = entries.map(e => ({
        ...e,
        percent: totalValue > 0 ? (e.value / totalValue) * 100 : 0,
      }))
    }

    return result
  }, [data, periodo])

  if (chartData.length === 0) return null

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartEntry }> }) => {
    if (!active || !payload?.length) return null
    const entry = payload[0].payload
    return (
      <div className="rounded-md border bg-background p-2 shadow-sm text-sm">
        <p className="font-medium">{entry.name}</p>
        <p className="text-muted-foreground">{entry.value.toLocaleString('es-CL')} uds.</p>
        <p className="text-muted-foreground">{entry.percent.toFixed(1)}%</p>
      </div>
    )
  }

  const displayLabel = centerLabel !== undefined
    ? (typeof centerLabel === 'number' ? centerLabel.toLocaleString('es-CL') : centerLabel)
    : null

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Donut chart con overlay de total en el centro */}
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
              className="cursor-pointer"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {displayLabel !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{displayLabel}</p>
              <p className="text-xs text-muted-foreground">uds. totales</p>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda personalizada — ordenada de mayor a menor (mismo orden que chartData) */}
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
