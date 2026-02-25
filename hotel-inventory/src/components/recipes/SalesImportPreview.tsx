/**
 * SalesImportPreview — Shows the computed deductions before confirming
 */

import { CheckCircle2, AlertCircle, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LOCATION_NAMES } from '@/types'
import type { SalesImportPreview as Preview } from '@/hooks/useSalesImport'

interface SalesImportPreviewProps {
  preview: Preview
}

export function SalesImportPreview({ preview }: SalesImportPreviewProps) {
  const { matched, unmatched, stockChanges } = preview

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-success/10 p-3 text-center">
          <p className="text-2xl font-bold text-success">{matched.length}</p>
          <p className="text-xs text-muted-foreground">Recetas mapeadas</p>
        </div>
        <div className="rounded-lg border bg-warning/10 p-3 text-center">
          <p className="text-2xl font-bold text-warning">{unmatched.length}</p>
          <p className="text-xs text-muted-foreground">Sin receta (se omiten)</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{stockChanges.length}</p>
          <p className="text-xs text-muted-foreground">Productos a descontar</p>
        </div>
      </div>

      {/* Stock changes summary */}
      {stockChanges.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Descuentos de stock a aplicar
          </h4>
          <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
            {stockChanges.map((change, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{change.product_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{change.product_code}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {LOCATION_NAMES[change.location]}
                  </Badge>
                  <span className="text-destructive font-medium">
                    -{change.totalMlToDeduct.toFixed(0)}ml
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matched recipes detail */}
      {matched.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2 text-success">
            <CheckCircle2 className="h-4 w-4" />
            Recetas encontradas ({matched.length})
          </h4>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {matched.map((item, i) => (
              <div key={i} className="rounded-md border p-3 space-y-1 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-medium">{item.recetaFNS}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {item.cantidad} vendida{item.cantidad !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {LOCATION_NAMES[item.location]}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  → {item.matchedRecipe.name} —{' '}
                  {item.deductions.map((d) => `${d.product_name}: ${d.quantity_ml.toFixed(0)}ml`).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unmatched recipes */}
      {unmatched.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2 text-warning">
              <AlertCircle className="h-4 w-4" />
              Sin receta en el sistema ({unmatched.length}) — se omitirán
            </h4>
            <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
              {unmatched.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{item.recetaFNS}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">{item.puntoDeVenta}</span>
                    <Badge variant="secondary" className="text-xs">
                      ×{item.cantidad}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Para incluir estas recetas en futuras importaciones, créalas en la sección de Recetas con el mismo nombre exacto.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
