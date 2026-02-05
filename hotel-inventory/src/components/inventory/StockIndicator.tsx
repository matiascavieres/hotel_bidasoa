import { Badge } from '@/components/ui/badge'

interface StockIndicatorProps {
  current: number
  minimum: number | null
}

export function StockIndicator({ current, minimum }: StockIndicatorProps) {
  if (current === 0) {
    return <Badge variant="destructive">Sin Stock</Badge>
  }

  if (minimum && current < minimum) {
    return <Badge variant="warning">Stock Bajo</Badge>
  }

  return <Badge variant="success">OK</Badge>
}
