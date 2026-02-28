interface SalesFamiliaChartItem {
  name: string
  value: number
  importe: number
}

interface SalesFamiliaChartProps {
  data: SalesFamiliaChartItem[]
  maxValue: number
  showImporte?: boolean
}

export function SalesFamiliaChart({ data, maxValue, showImporte = false }: SalesFamiliaChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Sin datos</p>
  }

  const total = data.reduce((s, d) => s + d.value, 0)
  const safeMax = maxValue > 0 ? maxValue : 1

  return (
    <div className="space-y-2.5">
      {data.map((item, index) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0
        const barWidth = (item.value / safeMax) * 100

        return (
          <div key={item.name} className="flex items-center gap-2 min-w-0">
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

            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  background: 'linear-gradient(to right, #2a5528, #66aa58)',
                }}
              />
            </div>

            <div className="text-right shrink-0" style={{ minWidth: '88px' }}>
              <span className="text-sm font-semibold tabular-nums">
                {showImporte
                  ? `$${item.importe.toLocaleString('es-CL')}`
                  : item.value.toLocaleString('es-CL')}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                {pct.toFixed(1)}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
