import { useState, useMemo } from 'react'
import {
  Plus,
  Upload,
  Search,
  BookOpen,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Tag,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import {
  useRecipes,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
} from '@/hooks/useRecipes'
import { useProducts } from '@/hooks/useProducts'
import { useCategories, useCreateProduct } from '@/hooks/useInventory'
import { RecipeImportWizard } from '@/components/recipes/RecipeImportWizard'
import { CasaSanzImportWizard } from '@/components/recipes/CasaSanzImportWizard'
import { cn } from '@/lib/utils'
import type { Recipe, RecipeIngredient, RecipeUnit, Product } from '@/types'

// ─── helpers ────────────────────────────────────────────────────────────────

function calcCost(qty: number, unit: RecipeUnit, pricePerKg: number | null): number {
  if (!pricePerKg || pricePerKg <= 0) return 0
  const factor = unit === 'gr' || unit === 'ml' ? qty / 1000 : qty
  return Math.round(factor * pricePerKg)
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('es-CL')
}

function priceLabelForUnit(unit: RecipeUnit): string {
  return unit === 'ml' || unit === 'lt' ? 'Precio/lt' : 'Precio/kg'
}

// ─── form types ──────────────────────────────────────────────────────────────

interface RecipeFormIngredient {
  product_id: string
  quantity_ml: number
  unit: RecipeUnit
  price_per_kg: number | null
}

const NEW_PRODUCT_SENTINEL = '__new__'

// ─── ProductGridPicker ────────────────────────────────────────────────────────
// Selector de producto estilo TFT: grilla multi-columna agrupada por categoría

interface ProductGridPickerProps {
  products: Product[]
  value: string
  onSelect: (id: string) => void
  onCreateNew: () => void
}

function ProductGridPicker({ products, value, onSelect, onCreateNew }: ProductGridPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedProduct = products.find((p) => p.id === value)

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.category?.name || '').toLowerCase().includes(search.toLowerCase())
      )
    : products

  const grouped = filtered.reduce(
    (acc, p) => {
      const cat = p.category?.name || 'Sin categoría'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(p)
      return acc
    },
    {} as Record<string, Product[]>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-left hover:bg-accent transition-colors truncate"
        >
          <span className={cn('truncate', !selectedProduct && 'text-muted-foreground')}>
            {selectedProduct?.name || 'Producto...'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[720px]"
        align="start"
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search + Create */}
        <div className="p-2 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar producto o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
              autoFocus
            />
          </div>
          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 text-sm font-semibold transition-colors"
            onClick={() => {
              setOpen(false)
              onCreateNew()
            }}
          >
            <Plus className="h-4 w-4" />
            Crear nuevo producto en el catálogo
          </button>
        </div>

        {/* Product grid */}
        <div className="max-h-72 overflow-y-auto p-2">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin resultados</p>
          ) : (
            Object.entries(grouped).map(([cat, prods]) => (
              <div key={cat} className="mb-3 last:mb-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-1">
                  {cat}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {prods.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={cn(
                        'text-left text-xs px-2 py-1.5 rounded border transition-colors truncate',
                        p.id === value
                          ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                          : 'border-transparent hover:bg-accent hover:border-border'
                      )}
                      onClick={() => {
                        onSelect(p.id)
                        setOpen(false)
                        setSearch('')
                      }}
                      title={p.name}
                    >
                      {p.id === value && <Check className="inline h-3 w-3 mr-0.5 shrink-0" />}
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── GrupoCombobox ────────────────────────────────────────────────────────────
// Input con sugerencias de grupos existentes en grilla

interface GrupoComboboxProps {
  value: string
  onChange: (v: string) => void
  existingGrupos: string[]
}

function GrupoCombobox({ value, onChange, existingGrupos }: GrupoComboboxProps) {
  const [open, setOpen] = useState(false)

  const filtered = existingGrupos.filter((g) =>
    !value || g.toLowerCase().includes(value.toLowerCase())
  )

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Ej: Salados del Futuro"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 w-full min-w-[320px] rounded-md border bg-popover shadow-md p-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
            Grupos existentes
          </p>
          <div className="grid grid-cols-2 gap-1">
            {filtered.map((g) => (
              <button
                key={g}
                type="button"
                className={cn(
                  'text-left text-sm px-2 py-1.5 rounded border transition-colors truncate',
                  g === value
                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                    : 'border-transparent hover:bg-accent hover:border-border'
                )}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(g)
                  setOpen(false)
                }}
                title={g}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── component ───────────────────────────────────────────────────────────────

export default function Recipes() {
  const { data: recipes, isLoading } = useRecipes()
  const { data: products } = useProducts()
  const { data: categories } = useCategories()
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const deleteRecipe = useDeleteRecipe()
  const createProduct = useCreateProduct()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [showXlsxWizard, setShowXlsxWizard] = useState(false)

  // Recipe Create/Edit form
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPortions, setFormPortions] = useState(1)
  const [formGrupo, setFormGrupo] = useState('')
  const [formIngredients, setFormIngredients] = useState<RecipeFormIngredient[]>([
    { product_id: '', quantity_ml: 0, unit: 'ml', price_per_kg: null },
  ])

  // Inline product creation
  const [showNewProductDialog, setShowNewProductDialog] = useState(false)
  const [newProductForIdx, setNewProductForIdx] = useState<number>(-1)
  const [newProdCode, setNewProdCode] = useState('')
  const [newProdName, setNewProdName] = useState('')
  const [newProdCategoryId, setNewProdCategoryId] = useState('')
  const [newProdFormatMl, setNewProdFormatMl] = useState(0)
  const [newProdSalePrice, setNewProdSalePrice] = useState<number | ''>('')

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Existing grupos for autocomplete
  const existingGrupos = useMemo(
    () =>
      [...new Set((recipes || []).map((r) => r.grupo).filter(Boolean) as string[])].sort(),
    [recipes]
  )

  const filteredRecipes = (recipes || []).filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.grupo || '').toLowerCase().includes(search.toLowerCase())
  )

  // ─── recipe form helpers ──────────────────────────────────────────────────

  function openCreateDialog() {
    setEditingRecipe(null)
    setFormName('')
    setFormDescription('')
    setFormPortions(1)
    setFormGrupo('')
    setFormIngredients([{ product_id: '', quantity_ml: 0, unit: 'ml', price_per_kg: null }])
    setShowFormDialog(true)
  }

  function openEditDialog(recipe: Recipe) {
    setEditingRecipe(recipe)
    setFormName(recipe.name)
    setFormDescription(recipe.description || '')
    setFormPortions(recipe.portions ?? 1)
    setFormGrupo(recipe.grupo || '')
    setFormIngredients(
      recipe.ingredients?.length
        ? recipe.ingredients.map((i) => ({
            product_id: i.product_id,
            quantity_ml: i.quantity_ml,
            unit: (i.unit as RecipeUnit) || 'ml',
            price_per_kg: i.price_per_kg ?? null,
          }))
        : [{ product_id: '', quantity_ml: 0, unit: 'ml', price_per_kg: null }]
    )
    setShowFormDialog(true)
  }

  function addIngredientRow() {
    setFormIngredients((prev) => [
      ...prev,
      { product_id: '', quantity_ml: 0, unit: 'ml', price_per_kg: null },
    ])
  }

  function removeIngredientRow(index: number) {
    setFormIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function updateIngredientRow(
    index: number,
    field: keyof RecipeFormIngredient,
    value: string | number | null
  ) {
    setFormIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  function handleProductSelect(idx: number, value: string) {
    if (value === NEW_PRODUCT_SENTINEL) {
      setNewProductForIdx(idx)
      setNewProdCode('')
      setNewProdName('')
      setNewProdCategoryId('')
      setNewProdFormatMl(0)
      setNewProdSalePrice('')
      setShowNewProductDialog(true)
    } else {
      updateIngredientRow(idx, 'product_id', value)
    }
  }

  // Form cost preview
  const formProductionValue = formIngredients.reduce(
    (sum, ing) => sum + calcCost(ing.quantity_ml, ing.unit, ing.price_per_kg),
    0
  )
  const formValuePerPortion =
    formPortions > 0 ? Math.round(formProductionValue / formPortions) : 0

  async function handleSubmit() {
    if (!formName.trim()) return
    const validIngredients = formIngredients.filter((i) => i.product_id && i.quantity_ml > 0)
    try {
      if (editingRecipe) {
        await updateRecipe.mutateAsync({
          id: editingRecipe.id,
          name: formName.trim(),
          description: formDescription.trim() || null,
          portions: formPortions,
          grupo: formGrupo.trim() || null,
          ingredients: validIngredients.map((i) => ({
            product_id: i.product_id,
            quantity_ml: i.quantity_ml,
            unit: i.unit,
            price_per_kg: i.price_per_kg ?? undefined,
          })),
        })
        toast({ title: 'Receta actualizada' })
      } else {
        await createRecipe.mutateAsync({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          portions: formPortions,
          grupo: formGrupo.trim() || undefined,
          ingredients: validIngredients.map((i) => ({
            product_id: i.product_id,
            quantity_ml: i.quantity_ml,
            unit: i.unit,
            price_per_kg: i.price_per_kg ?? undefined,
          })),
        })
        toast({ title: 'Receta creada' })
      }
      setShowFormDialog(false)
    } catch {
      toast({ title: 'Error al guardar receta', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRecipe.mutateAsync(id)
      toast({ title: 'Receta eliminada' })
      setDeletingId(null)
    } catch {
      toast({ title: 'Error al eliminar receta', variant: 'destructive' })
    }
  }

  // ─── inline product creation ──────────────────────────────────────────────

  async function handleCreateProduct() {
    if (!newProdName.trim() || !newProdCategoryId) return
    try {
      const product = await createProduct.mutateAsync({
        code: newProdCode.trim() || `PROD-${Date.now()}`,
        name: newProdName.trim(),
        categoryId: newProdCategoryId,
        formatMl: newProdFormatMl || 0,
        salePrice: typeof newProdSalePrice === 'number' ? newProdSalePrice : undefined,
      })
      if (newProductForIdx >= 0) {
        updateIngredientRow(newProductForIdx, 'product_id', product.id)
      }
      setShowNewProductDialog(false)
      toast({ title: `Producto "${product.name}" creado y seleccionado` })
    } catch {
      toast({ title: 'Error al crear producto', variant: 'destructive' })
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recetas</h1>
          <p className="text-muted-foreground">
            Catálogo de recetas con cuadro de costos por ingrediente
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowImportWizard(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowXlsxWizard(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Importar XLSX
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Receta
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar receta o grupo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Recipe list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12" />
          <p className="text-lg font-medium">
            {search ? 'No se encontraron recetas' : 'No hay recetas aún'}
          </p>
          {!search && (
            <p className="text-sm">Crea una receta manualmente o importa desde CSV/XLSX</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecipes.map((recipe) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              expanded={expandedId === recipe.id}
              onToggle={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
              onEdit={() => openEditDialog(recipe)}
              onDelete={() => setDeletingId(recipe.id)}
            />
          ))}
        </div>
      )}

      {/* ─── Create/Edit Recipe Dialog ─────────────────────────────────────── */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? 'Editar receta' : 'Nueva receta'}</DialogTitle>
            <DialogDescription>
              Define ingredientes, unidades y precio por kg/lt
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">
            {/* Name + Description */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Tacos del Futuro"
                />
              </div>
              <div className="space-y-1">
                <Label>Descripción (opcional)</Label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ej: Entrada vegana"
                />
              </div>
            </div>

            {/* Grupo + Porciones */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  Grupo (ventas)
                </Label>
                <GrupoCombobox
                  value={formGrupo}
                  onChange={setFormGrupo}
                  existingGrupos={existingGrupos}
                />
                <p className="text-xs text-muted-foreground">
                  Debe coincidir con el campo "Grupo" del reporte FNS
                </p>
              </div>
              <div className="space-y-1">
                <Label>Porciones</Label>
                <Input
                  type="number"
                  min="1"
                  value={formPortions}
                  onChange={(e) => setFormPortions(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <Separator />

            {/* Ingredient table header */}
            <div className="grid grid-cols-[1fr_80px_90px_100px_32px] gap-2 px-1">
              <span className="text-xs font-medium text-muted-foreground">Ingrediente</span>
              <span className="text-xs font-medium text-muted-foreground">Cantidad</span>
              <span className="text-xs font-medium text-muted-foreground">Unidad</span>
              <span className="text-xs font-medium text-muted-foreground">Precio/kg-lt</span>
              <span />
            </div>

            <div className="space-y-2">
              {formIngredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_80px_90px_100px_32px] gap-2 items-center"
                >
                  <ProductGridPicker
                    products={products || []}
                    value={ing.product_id}
                    onSelect={(id) => updateIngredientRow(idx, 'product_id', id)}
                    onCreateNew={() => handleProductSelect(idx, NEW_PRODUCT_SENTINEL)}
                  />

                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={ing.quantity_ml || ''}
                    onChange={(e) =>
                      updateIngredientRow(idx, 'quantity_ml', parseFloat(e.target.value) || 0)
                    }
                    className="h-8 text-sm"
                  />

                  <Select
                    value={ing.unit}
                    onValueChange={(v) => updateIngredientRow(idx, 'unit', v as RecipeUnit)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gr">gr</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="lt">lt</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={ing.price_per_kg ?? ''}
                    onChange={(e) =>
                      updateIngredientRow(
                        idx,
                        'price_per_kg',
                        e.target.value === '' ? null : parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder={priceLabelForUnit(ing.unit)}
                    className="h-8 text-sm"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => removeIngredientRow(idx)}
                    disabled={formIngredients.length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addIngredientRow} className="w-full mt-1">
                <Plus className="mr-1 h-3 w-3" />
                Agregar ingrediente
              </Button>
            </div>

            {/* Live cost preview */}
            {formProductionValue > 0 && (
              <>
                <Separator />
                <div className="grid grid-cols-3 gap-3 rounded-md bg-muted px-3 py-2 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Porciones</p>
                    <p className="font-semibold">{formPortions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Valor producción</p>
                    <p className="font-semibold">${formatNumber(formProductionValue)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Valor por porción</p>
                    <p className="font-semibold">${formatNumber(formValuePerPortion)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formName.trim() || createRecipe.isPending || updateRecipe.isPending}
            >
              {(createRecipe.isPending || updateRecipe.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingRecipe ? 'Guardar cambios' : 'Crear receta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Inline New Product Dialog ─────────────────────────────────────── */}
      <Dialog open={showNewProductDialog} onOpenChange={setShowNewProductDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Crear nuevo producto</DialogTitle>
            <DialogDescription>
              El producto se agregará al catálogo y se seleccionará automáticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Código</Label>
                <Input
                  value={newProdCode}
                  onChange={(e) => setNewProdCode(e.target.value)}
                  placeholder="Ej: ABR-001"
                />
              </div>
              <div className="space-y-1">
                <Label>Categoría *</Label>
                <Select value={newProdCategoryId} onValueChange={setNewProdCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                placeholder="Ej: Arroz grano corto"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Formato (ml)</Label>
                <Input
                  type="number"
                  min="0"
                  value={newProdFormatMl || ''}
                  onChange={(e) => setNewProdFormatMl(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label>Precio venta ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={newProdSalePrice}
                  onChange={(e) =>
                    setNewProdSalePrice(
                      e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProductDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateProduct}
              disabled={!newProdName.trim() || !newProdCategoryId || createProduct.isPending}
            >
              {createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear y seleccionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirm ────────────────────────────────────────────────── */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar receta?</DialogTitle>
            <DialogDescription>
              Esta acción desactivará la receta. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={deleteRecipe.isPending}
            >
              {deleteRecipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Import wizards ────────────────────────────────────────────────── */}
      <RecipeImportWizard
        open={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onSuccess={(count) => toast({ title: `${count} recetas importadas exitosamente` })}
      />
      <CasaSanzImportWizard
        open={showXlsxWizard}
        onClose={() => setShowXlsxWizard(false)}
        onSuccess={(count) => toast({ title: `${count} recetas importadas desde Excel` })}
      />
    </div>
  )
}

// ─── RecipeRow ────────────────────────────────────────────────────────────────

interface RecipeRowProps {
  recipe: Recipe
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

function RecipeRow({ recipe, expanded, onToggle, onEdit, onDelete }: RecipeRowProps) {
  const ingredients = recipe.ingredients || []
  const portions = recipe.portions ?? 1

  const ingredientsWithCost = ingredients.map((ing: RecipeIngredient) => {
    const unit = (ing.unit as RecipeUnit) || 'ml'
    const cost = calcCost(ing.quantity_ml, unit, ing.price_per_kg)
    return { ing, unit, cost }
  })

  const productionValue = ingredientsWithCost.reduce((sum, { cost }) => sum + cost, 0)
  const valuePerPortion = portions > 0 ? Math.round(productionValue / portions) : 0
  const hasCosts = productionValue > 0

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          className="flex-1 flex items-center gap-3 text-left min-w-0"
          onClick={onToggle}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{recipe.name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {recipe.grupo && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Tag className="h-3 w-3" />
                  {recipe.grupo}
                </span>
              )}
              {recipe.description && (
                <span className="text-xs text-muted-foreground truncate">{recipe.description}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs">
              {ingredients.length} ingredientes
            </Badge>
            {hasCosts && (
              <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                ${formatNumber(productionValue)}
              </Badge>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded cost table */}
      {expanded && (
        <>
          <Separator />
          <div className="px-4 py-3">
            {ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Sin ingredientes registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left py-1.5 font-medium pr-4">Ingrediente</th>
                      <th className="text-right py-1.5 font-medium pr-4">Cantidad</th>
                      <th className="text-right py-1.5 font-medium pr-4">Precio/kg</th>
                      <th className="text-right py-1.5 font-medium pr-4">Costo Total</th>
                      <th className="text-right py-1.5 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientsWithCost.map(({ ing, unit, cost }) => {
                      const pct =
                        productionValue > 0 ? Math.round((cost / productionValue) * 100) : 0
                      return (
                        <tr key={ing.id} className="border-b border-border/40 hover:bg-muted/30">
                          <td className="py-1.5 pr-4 font-medium">
                            {ing.product?.name || ing.product_id}
                          </td>
                          <td className="py-1.5 pr-4 text-right text-muted-foreground">
                            {Math.round(ing.quantity_ml)} {unit}
                          </td>
                          <td className="py-1.5 pr-4 text-right text-muted-foreground">
                            {ing.price_per_kg ? `$${formatNumber(ing.price_per_kg)}` : '—'}
                          </td>
                          <td className="py-1.5 pr-4 text-right font-medium">
                            {cost > 0 ? `$${formatNumber(cost)}` : '—'}
                          </td>
                          <td className="py-1.5 text-right text-muted-foreground">
                            {cost > 0 ? `${pct}%` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Footer summary */}
                <div className="mt-3 grid grid-cols-3 gap-3 rounded-md bg-muted px-3 py-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Porciones</p>
                    <p className="text-sm font-semibold">{portions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Valor producción</p>
                    <p className="text-sm font-semibold">
                      {hasCosts ? `$${formatNumber(productionValue)}` : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Valor por porción</p>
                    <p className="text-sm font-semibold">
                      {hasCosts ? `$${formatNumber(valuePerPortion)}` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
