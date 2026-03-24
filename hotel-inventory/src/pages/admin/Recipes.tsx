import { useState, useMemo, useEffect, useRef } from 'react'
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
  ImageIcon,
  X,
  Info,
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
import { useSalesGrupos, useSalesData } from '@/hooks/useSalesData'
import { RecipeImportWizard } from '@/components/recipes/RecipeImportWizard'
import { CasaSanzImportWizard } from '@/components/recipes/CasaSanzImportWizard'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
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
  const { data: salesGrupos } = useSalesGrupos()
  const { data: salesData } = useSalesData()

  // Match each recipe to its sales record (exact first, then contains-match)
  const salesMatchByRecipeId = useMemo(() => {
    const result = new Map<string, number>()
    if (!salesData || !recipes) return result

    for (const recipe of recipes) {
      const rName = recipe.name.toLowerCase().trim()

      // 1. Exact match
      const exact = salesData.find((s) => s.receta.toLowerCase().trim() === rName)
      if (exact) { result.set(recipe.id, exact.importe_unitario); continue }

      // 2. Contains match (shorter string min 5 chars to avoid false positives)
      const fuzzy = salesData.find((s) => {
        const sName = s.receta.toLowerCase().trim()
        const shorter = rName.length <= sName.length ? rName : sName
        if (shorter.length < 5) return false
        return rName.includes(sName) || sName.includes(rName)
      })
      if (fuzzy) result.set(recipe.id, fuzzy.importe_unitario)
    }
    return result
  }, [salesData, recipes])
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
  const [formComments, setFormComments] = useState('')
  const [formIngredients, setFormIngredients] = useState<RecipeFormIngredient[]>([
    { product_id: '', quantity_ml: 0, unit: 'ml', price_per_kg: null },
  ])

  // Images
  const [formExistingImages, setFormExistingImages] = useState<string[]>([])
  const [formNewImageFiles, setFormNewImageFiles] = useState<File[]>([])
  const [formNewImagePreviews, setFormNewImagePreviews] = useState<string[]>([])
  const imageInputRef = useRef<HTMLInputElement>(null)

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

  // Grupos from sales report (primary) + recipe grupos already in use
  const existingGrupos = useMemo(() => {
    const fromSales = salesGrupos || []
    const fromRecipes = (recipes || []).map((r) => r.grupo).filter(Boolean) as string[]
    return [...new Set([...fromSales, ...fromRecipes])].sort()
  }, [salesGrupos, recipes])

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
    setFormComments('')
    setFormIngredients([{ product_id: '', quantity_ml: 0, unit: 'ml', price_per_kg: null }])
    setFormExistingImages([])
    setFormNewImageFiles([])
    setFormNewImagePreviews([])
    setShowFormDialog(true)
  }

  function openEditDialog(recipe: Recipe) {
    setEditingRecipe(recipe)
    setFormName(recipe.name)
    setFormDescription(recipe.description || '')
    setFormPortions(recipe.portions ?? 1)
    setFormGrupo(recipe.grupo || '')
    setFormComments(recipe.comments || '')
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
    setFormExistingImages(recipe.image_urls || [])
    setFormNewImageFiles([])
    setFormNewImagePreviews([])
    setShowFormDialog(true)
  }

  function handleImageFilesSelected(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files)
    setFormNewImageFiles((prev) => [...prev, ...newFiles])
    const previews = newFiles.map((f) => URL.createObjectURL(f))
    setFormNewImagePreviews((prev) => [...prev, ...previews])
  }

  function removeExistingImage(idx: number) {
    setFormExistingImages((prev) => prev.filter((_, i) => i !== idx))
  }

  function removeNewImage(idx: number) {
    URL.revokeObjectURL(formNewImagePreviews[idx])
    setFormNewImageFiles((prev) => prev.filter((_, i) => i !== idx))
    setFormNewImagePreviews((prev) => prev.filter((_, i) => i !== idx))
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
          comments: formComments.trim() || null,
          ingredients: validIngredients.map((i) => ({
            product_id: i.product_id,
            quantity_ml: i.quantity_ml,
            unit: i.unit,
            price_per_kg: i.price_per_kg ?? undefined,
          })),
          imageFiles: formNewImageFiles,
          existingImagePaths: formExistingImages,
        })
        toast({ title: 'Receta actualizada' })
      } else {
        await createRecipe.mutateAsync({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          portions: formPortions,
          grupo: formGrupo.trim() || undefined,
          comments: formComments.trim() || undefined,
          ingredients: validIngredients.map((i) => ({
            product_id: i.product_id,
            quantity_ml: i.quantity_ml,
            unit: i.unit,
            price_per_kg: i.price_per_kg ?? undefined,
          })),
          imageFiles: formNewImageFiles,
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
              importeVenta={salesMatchByRecipeId.get(recipe.id) ?? null}
            />
          ))}
        </div>
      )}

      {/* ─── Create/Edit Recipe Dialog ─────────────────────────────────────── */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto">
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

            {/* Comentarios */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                Comentarios / Notas de preparación
              </Label>
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="Ej: Preparar la salsa con anticipación, servir frío, etc."
                value={formComments}
                onChange={(e) => setFormComments(e.target.value)}
                rows={3}
              />
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

            {/* Images */}
            <Separator />
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                Imágenes
              </Label>
              <div className="flex flex-wrap gap-2">
                {/* Existing images */}
                {formExistingImages.map((path, idx) => (
                  <ExistingImageThumb
                    key={path}
                    path={path}
                    onRemove={() => removeExistingImage(idx)}
                  />
                ))}
                {/* New image previews */}
                {formNewImagePreviews.map((url, idx) => (
                  <div key={url} className="relative w-20 h-20 rounded-md overflow-hidden border group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(idx)}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                {/* Add button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-20 h-20 rounded-md border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-[10px]">Agregar</span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageFilesSelected(e.target.files)}
                />
              </div>
            </div>
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

// ─── RecipeImageGallery ───────────────────────────────────────────────────────

function RecipeImageGallery({ paths }: { paths: string[] }) {
  const [signedUrls, setSignedUrls] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    Promise.all(
      paths.map((p) =>
        supabase.storage.from('product-images').createSignedUrl(p, 3600).then(({ data }) => data?.signedUrl || '')
      )
    ).then((urls) => setSignedUrls(urls.filter(Boolean)))
  }, [paths])

  if (signedUrls.length === 0) return null

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {signedUrls.map((url, idx) => (
          <button
            key={url}
            type="button"
            onClick={() => setLightbox(idx)}
            className="w-20 h-20 rounded-md overflow-hidden border hover:opacity-90 transition-opacity"
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img
            src={signedUrls[lightbox]}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {signedUrls.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2"
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + signedUrls.length) % signedUrls.length) }}
              >
                <ChevronUp className="h-5 w-5 -rotate-90" />
              </button>
              <button
                className="absolute right-16 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2"
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % signedUrls.length) }}
              >
                <ChevronDown className="h-5 w-5 -rotate-90" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ─── ExistingImageThumb ───────────────────────────────────────────────────────

function ExistingImageThumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.storage
      .from('product-images')
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl || null))
  }, [path])

  return (
    <div className="relative w-20 h-20 rounded-md overflow-hidden border group bg-muted">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3 text-white" />
      </button>
    </div>
  )
}

// ─── RecipeThumbnail ──────────────────────────────────────────────────────────

function RecipeThumbnail({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.storage
      .from('product-images')
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl || null))
  }, [path])

  return (
    <div className="w-12 h-12 rounded-md overflow-hidden border bg-muted shrink-0">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
        </div>
      )}
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
  importeVenta: number | null
}

function RecipeRow({ recipe, expanded, onToggle, onEdit, onDelete, importeVenta }: RecipeRowProps) {
  const importeNeto = importeVenta ? Math.round(importeVenta / 1.19) : null
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
          {(recipe.image_urls || []).length > 0 && (
            <RecipeThumbnail path={recipe.image_urls[0]} />
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
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Badge variant="outline" className="text-xs">
              {ingredients.length} ingredientes
            </Badge>
            {hasCosts && (
              <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                Costo ${formatNumber(productionValue)}
              </Badge>
            )}
            {importeVenta && (
              <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                Venta ${formatNumber(importeVenta)}
              </Badge>
            )}
            {importeNeto && (
              <Badge className="text-xs bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-100">
                Neto ${formatNumber(importeNeto)}
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
                      <th className="text-right py-1.5 font-medium pr-4">Precio/kg·lt</th>
                      <th className="text-right py-1.5 font-medium pr-4">Precio/gr·ml</th>
                      <th className="text-right py-1.5 font-medium pr-4">Cantidad</th>
                      <th className="text-right py-1.5 font-medium pr-4">Costo Total</th>
                      <th className="text-right py-1.5 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientsWithCost.map(({ ing, unit, cost }) => {
                      const pct =
                        productionValue > 0 ? Math.round((cost / productionValue) * 100) : 0
                      const pricePerGrMl = ing.price_per_kg ? ing.price_per_kg / 1000 : null
                      return (
                        <tr key={ing.id} className="border-b border-border/40 hover:bg-muted/30">
                          <td className="py-1.5 pr-4 font-medium">
                            {ing.product?.name || ing.product_id}
                          </td>
                          <td className="py-1.5 pr-4 text-right text-muted-foreground">
                            {ing.price_per_kg ? `$${formatNumber(ing.price_per_kg)}` : '—'}
                          </td>
                          <td className="py-1.5 pr-4 text-right text-muted-foreground">
                            {pricePerGrMl
                              ? `$${pricePerGrMl.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                          <td className="py-1.5 pr-4 text-right text-muted-foreground">
                            {Math.round(ing.quantity_ml)} {unit}
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
                <div className="mt-3 rounded-md bg-muted px-3 pt-2 pb-3">
                  {/* header row with info button */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumen</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="end" className="w-80 text-xs space-y-3 p-4">
                        <p className="font-semibold text-sm">¿Cómo se calculan los valores?</p>
                        <div className="space-y-2 text-muted-foreground leading-relaxed">
                          <div>
                            <span className="font-medium text-foreground">Costo producción</span>
                            <p>Σ (cantidad × precio/kg) de cada ingrediente. Si la unidad es gr o ml, se divide la cantidad entre 1.000 antes de multiplicar por el precio por kg/lt.</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Costo por porción</span>
                            <p>Costo producción ÷ Porciones</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Imp. Venta</span>
                            <p>Precio de venta del reporte FNS (incluye IVA 19%). Se cruza automáticamente por nombre de receta.</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Imp. Neto</span>
                            <p>Imp. Venta ÷ 1,19 → precio sin IVA</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">% Costo / Venta</span>
                            <p>(Costo por porción ÷ Imp. Neto) × 100 → qué porcentaje del precio neto representa el costo de ingredientes. Ideal: ≤30% 🟢, 31-40% 🟡, &gt;40% 🔴.</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">% Utilidad</span>
                            <p>100 − % Costo/Venta → porcentaje del precio neto que queda como margen bruto. Ideal: ≥70% 🟢, 60-69% 🟡, &lt;60% 🔴.</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Margen neto</span>
                            <p>Imp. Neto − Costo por porción → pesos de utilidad bruta por porción vendida (sin mano de obra ni costos fijos).</p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className={`grid gap-3 ${importeVenta ? 'grid-cols-6' : 'grid-cols-3'}`}>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Porciones</p>
                      <p className="text-sm font-semibold">{portions}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Costo producción</p>
                      <p className="text-sm font-semibold">
                        {hasCosts ? `$${formatNumber(productionValue)}` : '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Costo por porción</p>
                      <p className="text-sm font-semibold">
                        {hasCosts ? `$${formatNumber(valuePerPortion)}` : '—'}
                      </p>
                    </div>
                    {importeVenta && (() => {
                      const pctCosto = hasCosts && importeNeto
                        ? Math.round((valuePerPortion / importeNeto) * 100)
                        : null
                      const pctUtilidad = pctCosto !== null ? 100 - pctCosto : null
                      const margen = hasCosts && importeNeto ? importeNeto - valuePerPortion : null
                      return (
                        <>
                          <div className="text-center border-l border-border/40">
                            <p className="text-xs text-muted-foreground">Imp. Venta</p>
                            <p className="text-sm font-semibold text-blue-700">${formatNumber(importeVenta)}</p>
                            {importeNeto && (
                              <>
                                <p className="text-xs text-muted-foreground mt-1">Imp. Neto</p>
                                <p className="text-sm font-semibold text-violet-700">${formatNumber(importeNeto)}</p>
                              </>
                            )}
                          </div>
                          <div className="text-center border-l border-border/40">
                            <p className="text-xs text-muted-foreground">% Costo/Venta</p>
                            <p className={`text-sm font-semibold ${
                              pctCosto !== null
                                ? pctCosto <= 30 ? 'text-emerald-700'
                                  : pctCosto <= 40 ? 'text-amber-600'
                                  : 'text-red-600'
                                : ''
                            }`}>
                              {pctCosto !== null ? `${pctCosto}%` : '—'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Margen neto</p>
                            <p className="text-sm font-semibold text-emerald-700">
                              {margen !== null ? `$${formatNumber(margen)}` : '—'}
                            </p>
                          </div>
                          <div className="text-center border-l border-border/40">
                            <p className="text-xs text-muted-foreground">% Utilidad</p>
                            <p className={`text-sm font-semibold ${
                              pctUtilidad !== null
                                ? pctUtilidad >= 70 ? 'text-emerald-700'
                                  : pctUtilidad >= 60 ? 'text-amber-600'
                                  : 'text-red-600'
                                : ''
                            }`}>
                              {pctUtilidad !== null ? `${pctUtilidad}%` : '—'}
                            </p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Comments */}
                {recipe.comments && (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-medium text-amber-800 mb-1 flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> Notas de preparación
                    </p>
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{recipe.comments}</p>
                  </div>
                )}

                {/* Images */}
                {(recipe.image_urls || []).length > 0 && (
                  <RecipeImageGallery paths={recipe.image_urls} />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
