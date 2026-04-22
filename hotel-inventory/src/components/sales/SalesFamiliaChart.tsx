import { useState } from 'react'

interface SalesFamiliaChartItem {
  name: string
  value: number
  importe: number
}

type Top5Item = { receta: string; importe_total: number }

interface SalesFamiliaChartProps {
  data: SalesFamiliaChartItem[]
  maxValue: number
  showImporte?: boolean
  showBoth?: boolean
  totalValue?: number
  tooltipData?: Map<string, Top5Item[]>
}

export function SalesFamiliaChart({ data, maxValue, showImporte = false, showBoth = false, totalValue, tooltipData }: SalesFamiliaChartProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Sin datos</p>
  }

  const total = totalValue ?? data.reduce((s, d) => s + d.value, 0)
  const safeMax = maxValue > 0 ? maxValue : 1

  return (
    <div className="space-y-2.5">
      {data.map((item, index) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0
        const barWidth = (item.value / safeMax) * 100
        const top5 = tooltipData?.get(item.name)
        const isHovered = hoveredItem === item.name

        return (
          <div
            key={item.name}
            className="relative flex items-center gap-2 min-w-0"
            onMouseEnter={() => top5 && setHoveredItem(item.name)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <span className="text-xs text-muted-foreground w-4 shrink-0 text-right tabular-nums">
              {index + 1}
            </span>

            <span
              className="text-sm truncate shrink-0"
              style={{ width: '28%', minWidth: '72px' }}
              title={item.name}
            >
              {item.name}
            </span>

            <div
              className="bg-muted rounded-full h-2 overflow-hidden"
              style={{ flex: 1 }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  background: 'linear-gradient(to right, #2a5528, #66aa58)',
                }}
              />
            </div>

            <div className="text-right shrink-0" style={{ minWidth: showBoth ? '148px' : '88px' }}>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-sm font-semibold tabular-nums">
                  {showImporte
                    ? `$${item.importe.toLocaleString('es-CL')}`
                    : showBoth
                      ? `$${item.value.toLocaleString('es-CL')}`
                      : item.value.toLocaleString('es-CL')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {pct.toFixed(1)}%
                </span>
              </div>
              {showBoth && item.importe > 0 && item.importe !== item.value && (
                <p className="text-xs text-muted-foreground tabular-nums leading-tight">
                  ${item.importe.toLocaleString('es-CL')} venta
                </p>
              )}
            </div>

            {isHovered && top5 && top5.length > 0 && (
              <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-md border bg-popover text-popover-foreground shadow-md p-3">
                <p className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
                  Top 5 — {item.name}
                </p>
                {item.importe > 0 && item.importe !== item.value && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Total venta: <span className="font-semibold text-foreground">${item.importe.toLocaleString('es-CL')}</span>
                  </p>
                )}
                <div className="space-y-1.5">
                  {top5.map((t, i) => {
                    const neto = Math.round(t.importe_total / 1.19)
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                        <span className="flex-1 truncate font-medium">{t.receta}</span>
                        <div className="text-right shrink-0">
                          <p className="tabular-nums font-semibold">{`$${t.importe_total.toLocaleString('es-CL')}`}</p>
                          <p className="tabular-nums text-muted-foreground">{`$${neto.toLocaleString('es-CL')} neto`}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
