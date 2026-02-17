import { useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SalesData } from '@/types'

interface SalesTableProps {
  data: SalesData[]
  isLoading: boolean
  error: Error | null
  periodo: 'total' | '2024' | '2025'
}

type SortField = 'receta' | 'grupo' | 'cantidad_2024' | 'cantidad_2025' | 'total' | 'daily_avg'
type SortDirection = 'asc' | 'desc'

export function SalesTable({ data, isLoading, error, periodo }: SalesTableProps) {
  const [sortField, setSortField] = useState<SortField>('total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      const modifier = sortDirection === 'asc' ? 1 : -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * modifier
      }
      return ((aVal as number) - (bVal as number)) * modifier
    })
  }, [data, sortField, sortDirection])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const getCantidad = (item: SalesData) => {
    switch (periodo) {
      case '2024': return item.cantidad_2024
      case '2025': return item.cantidad_2025
      default: return item.total
    }
  }

  const formatNumber = (n: number) => n.toLocaleString('es-CL')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive">
        Error al cargar datos de ventas: {error.message}
      </div>
    )
  }

  if (sortedData.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No se encontraron productos
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium w-10">#</th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('receta')}
                >
                  <span className="inline-flex items-center">
                    Receta
                    <SortIcon field="receta" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('grupo')}
                >
                  <span className="inline-flex items-center">
                    Grupo
                    <SortIcon field="grupo" />
                  </span>
                </th>
                {periodo === 'total' && (
                  <>
                    <th
                      className="px-4 py-3 text-right text-sm font-medium cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('cantidad_2024')}
                    >
                      <span className="inline-flex items-center justify-end">
                        Cant. 2024
                        <SortIcon field="cantidad_2024" />
                      </span>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-sm font-medium cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('cantidad_2025')}
                    >
                      <span className="inline-flex items-center justify-end">
                        Cant. 2025
                        <SortIcon field="cantidad_2025" />
                      </span>
                    </th>
                  </>
                )}
                <th
                  className="px-4 py-3 text-right text-sm font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('total')}
                >
                  <span className="inline-flex items-center justify-end">
                    {periodo === 'total' ? 'Total Ventas' : `Ventas ${periodo}`}
                    <SortIcon field="total" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-right text-sm font-medium cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('daily_avg')}
                >
                  <span className="inline-flex items-center justify-end">
                    Prom/Dia
                    <SortIcon field="daily_avg" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.receta}</p>
                    {item.familia && (
                      <p className="text-xs text-muted-foreground">{item.familia}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{item.grupo}</Badge>
                  </td>
                  {periodo === 'total' && (
                    <>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatNumber(item.cantidad_2024)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatNumber(item.cantidad_2025)}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatNumber(getCantidad(item))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {item.daily_avg.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {sortedData.map((item, index) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{index + 1}.</span>
                    <p className="font-medium truncate">{item.receta}</p>
                  </div>
                  <Badge variant="outline" className="mt-1">{item.grupo}</Badge>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold">{formatNumber(getCantidad(item))}</p>
                  <p className="text-xs text-muted-foreground">ventas</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">2024</p>
                  <p className="font-medium">{formatNumber(item.cantidad_2024)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">2025</p>
                  <p className="font-medium">{formatNumber(item.cantidad_2025)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prom/dia</p>
                  <p className="font-medium">{item.daily_avg.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
