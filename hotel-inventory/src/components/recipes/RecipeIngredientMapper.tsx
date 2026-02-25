/**
 * RecipeIngredientMapper — Step 3 of the Recipe CSV Import Wizard
 *
 * Shows all unique ingredient names extracted from the CSV and lets the admin
 * map each one to a product in the catalog (or mark it as "Omitir").
 */

import { useState, useMemo } from 'react'
import { Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProducts } from '@/hooks/useProducts'

export interface IngredientMapping {
  ingredientName: string
  /** null = skipped, string = product_id */
  productId: string | null
  quantityMl: number
  skip: boolean
}

interface UniqueIngredient {
  name: string
  appearances: number
  exampleQuantityMl: number
  unit: string
  isLiquid: boolean
}

interface RecipeIngredientMapperProps {
  uniqueIngredients: UniqueIngredient[]
  mappings: Record<string, IngredientMapping>
  onChange: (updated: Record<string, IngredientMapping>) => void
}

export function RecipeIngredientMapper({
  uniqueIngredients,
  mappings,
  onChange,
}: RecipeIngredientMapperProps) {
  const { data: products } = useProducts()
  const [search, setSearch] = useState('')
  const [showOnlyUnmapped, setShowOnlyUnmapped] = useState(false)

  const filteredIngredients = useMemo(() => {
    return uniqueIngredients.filter((ing) => {
      if (search && !ing.name.toLowerCase().includes(search.toLowerCase())) return false
      if (showOnlyUnmapped) {
        const mapping = mappings[ing.name.toLowerCase()]
        if (mapping?.skip || mapping?.productId) return false
      }
      return true
    })
  }, [uniqueIngredients, search, showOnlyUnmapped, mappings])

  const mappedCount = useMemo(() => {
    return uniqueIngredients.filter((ing) => {
      const m = mappings[ing.name.toLowerCase()]
      return m?.productId || m?.skip
    }).length
  }, [uniqueIngredients, mappings])

  function updateMapping(ingredientName: string, update: Partial<IngredientMapping>) {
    const key = ingredientName.toLowerCase()
    const current = mappings[key] || {
      ingredientName,
      productId: null,
      quantityMl: uniqueIngredients.find((i) => i.name.toLowerCase() === key)?.exampleQuantityMl || 0,
      skip: false,
    }
    onChange({
      ...mappings,
      [key]: { ...current, ...update },
    })
  }

  const getLiquidIngredients = () => uniqueIngredients.filter((i) => i.isLiquid)
  const getNonLiquidIngredients = () => uniqueIngredients.filter((i) => !i.isLiquid)

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <div className="flex-1 text-sm">
          <span className="font-medium">{mappedCount}</span>
          <span className="text-muted-foreground"> / {uniqueIngredients.length} ingredientes mapeados</span>
        </div>
        {mappedCount === uniqueIngredients.length ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completo
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {uniqueIngredients.length - mappedCount} pendientes
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <Checkbox
            checked={showOnlyUnmapped}
            onCheckedChange={(v) => setShowOnlyUnmapped(!!v)}
          />
          Solo sin mapear
        </label>
      </div>

      {/* Liquid ingredients (most important) */}
      {getLiquidIngredients().length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Ingredientes líquidos ({getLiquidIngredients().length})
          </h4>
          <div className="space-y-2">
            {filteredIngredients
              .filter((i) => i.isLiquid)
              .map((ing) => (
                <IngredientRow
                  key={ing.name}
                  ingredient={ing}
                  mapping={mappings[ing.name.toLowerCase()]}
                  products={products || []}
                  onChange={(update) => updateMapping(ing.name, update)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Non-liquid ingredients */}
      {getNonLiquidIngredients().length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            No líquidos / Decoraciones ({getNonLiquidIngredients().length})
          </h4>
          <p className="text-xs text-muted-foreground">
            Estos ingredientes no tienen unidad en oz/ml. Se omiten por defecto.
          </p>
          <div className="space-y-2">
            {filteredIngredients
              .filter((i) => !i.isLiquid)
              .map((ing) => (
                <IngredientRow
                  key={ing.name}
                  ingredient={ing}
                  mapping={mappings[ing.name.toLowerCase()]}
                  products={products || []}
                  onChange={(update) => updateMapping(ing.name, update)}
                  defaultSkip
                />
              ))}
          </div>
        </div>
      )}

      {filteredIngredients.length === 0 && (
        <p className="py-4 text-center text-muted-foreground">
          No hay ingredientes que coincidan con la búsqueda
        </p>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------

interface IngredientRowProps {
  ingredient: UniqueIngredient
  mapping?: IngredientMapping
  products: { id: string; name: string; code: string; format_ml: number | null }[]
  onChange: (update: Partial<IngredientMapping>) => void
  defaultSkip?: boolean
}

function IngredientRow({ ingredient, mapping, products, onChange, defaultSkip = false }: IngredientRowProps) {
  const isSkipped = mapping?.skip ?? defaultSkip
  const productId = mapping?.productId ?? null
  const quantityMl = mapping?.quantityMl ?? ingredient.exampleQuantityMl

  const statusIcon = isSkipped
    ? <span className="text-xs text-muted-foreground">Omitido</span>
    : productId
      ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
      : <AlertCircle className="h-4 w-4 text-warning shrink-0" />

  return (
    <div
      className={`rounded-md border p-3 transition-colors ${
        isSkipped ? 'opacity-50 bg-muted/20' : 'bg-card'
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Status icon */}
        <div className="shrink-0">{statusIcon}</div>

        {/* Ingredient info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{ingredient.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {ingredient.appearances} receta{ingredient.appearances !== 1 ? 's' : ''}
            </span>
            {ingredient.isLiquid && (
              <Badge variant="outline" className="text-xs">
                {ingredient.unit} → {ingredient.exampleQuantityMl}ml aprox.
              </Badge>
            )}
          </div>
        </div>

        {/* Quantity (ml) override */}
        {ingredient.isLiquid && !isSkipped && (
          <div className="flex items-center gap-1 shrink-0">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={quantityMl}
              onChange={(e) => onChange({ quantityMl: parseFloat(e.target.value) || 0 })}
              className="w-20 h-8 text-sm"
              title="ml por unidad"
            />
            <span className="text-xs text-muted-foreground">ml</span>
          </div>
        )}

        {/* Product selector */}
        {!isSkipped && (
          <div className="w-full sm:w-56 shrink-0">
            <Select
              value={productId || '__none__'}
              onValueChange={(v) => onChange({ productId: v === '__none__' ? null : v })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Seleccionar producto..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- Sin asignar --</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.format_ml ? ` (${p.format_ml}ml)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Skip checkbox */}
        <label className="flex cursor-pointer items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
          <Checkbox
            checked={isSkipped}
            onCheckedChange={(v) => onChange({ skip: !!v, productId: null })}
          />
          Omitir
        </label>
      </div>
    </div>
  )
}
