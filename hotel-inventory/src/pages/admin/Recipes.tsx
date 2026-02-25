import { useState } from 'react'
import { Plus, Upload, Search, BookOpen, Pencil, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import { useRecipes, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from '@/hooks/useRecipes'
import { useProducts } from '@/hooks/useProducts'
import { RecipeImportWizard } from '@/components/recipes/RecipeImportWizard'
import type { Recipe, RecipeIngredient } from '@/types'

interface RecipeFormIngredient {
  product_id: string
  quantity_ml: number
}

export default function Recipes() {
  const { data: recipes, isLoading } = useRecipes()
  const { data: products } = useProducts()
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const deleteRecipe = useDeleteRecipe()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showImportWizard, setShowImportWizard] = useState(false)

  // Create/Edit dialog state
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formIngredients, setFormIngredients] = useState<RecipeFormIngredient[]>([
    { product_id: '', quantity_ml: 0 },
  ])

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredRecipes = (recipes || []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  function openCreateDialog() {
    setEditingRecipe(null)
    setFormName('')
    setFormDescription('')
    setFormIngredients([{ product_id: '', quantity_ml: 0 }])
    setShowFormDialog(true)
  }

  function openEditDialog(recipe: Recipe) {
    setEditingRecipe(recipe)
    setFormName(recipe.name)
    setFormDescription(recipe.description || '')
    setFormIngredients(
      recipe.ingredients?.length
        ? recipe.ingredients.map((i) => ({
            product_id: i.product_id,
            quantity_ml: i.quantity_ml,
          }))
        : [{ product_id: '', quantity_ml: 0 }]
    )
    setShowFormDialog(true)
  }

  function addIngredientRow() {
    setFormIngredients((prev) => [...prev, { product_id: '', quantity_ml: 0 }])
  }

  function removeIngredientRow(index: number) {
    setFormIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function updateIngredientRow(index: number, field: keyof RecipeFormIngredient, value: string | number) {
    setFormIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  async function handleSubmit() {
    if (!formName.trim()) return

    const validIngredients = formIngredients.filter(
      (i) => i.product_id && i.quantity_ml > 0
    )

    try {
      if (editingRecipe) {
        await updateRecipe.mutateAsync({
          id: editingRecipe.id,
          name: formName.trim(),
          description: formDescription.trim() || null,
          ingredients: validIngredients,
        })
        toast({ title: 'Receta actualizada' })
      } else {
        await createRecipe.mutateAsync({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          ingredients: validIngredients,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recetas</h1>
          <p className="text-muted-foreground">
            Catálogo de recetas de cócteles con sus ingredientes en ml
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowImportWizard(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Receta
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar receta..."
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
            <p className="text-sm">
              Crea una receta manualmente o importa desde CSV
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecipes.map((recipe) => {
            const isExpanded = expandedId === recipe.id
            return (
              <Card key={recipe.id} className="overflow-hidden">
                <CardHeader className="pb-0 pt-3 px-4">
                  <div className="flex items-center gap-3">
                    <button
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                      onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{recipe.name}</p>
                        {recipe.description && (
                          <p className="text-xs text-muted-foreground truncate">{recipe.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {recipe.ingredients?.length || 0} ingredientes
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(recipe)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(recipe.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-3 pb-4 px-4">
                    <Separator className="mb-3" />
                    {recipe.ingredients?.length ? (
                      <div className="space-y-1.5">
                        {recipe.ingredients.map((ing: RecipeIngredient) => (
                          <div key={ing.id} className="flex items-center justify-between text-sm">
                            <span>{ing.product?.name || ing.product_id}</span>
                            <span className="font-medium text-muted-foreground">
                              {ing.quantity_ml}ml
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin ingredientes registrados</p>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? 'Editar receta' : 'Nueva receta'}</DialogTitle>
            <DialogDescription>
              Define los ingredientes con sus cantidades en ml
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
            <div className="space-y-2">
              <Label>Nombre del cóctel *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Moscow Mule"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ej: Versión Casa Sanz"
              />
            </div>

            <div className="space-y-2">
              <Label>Ingredientes</Label>
              <div className="space-y-2">
                {formIngredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      value={ing.product_id}
                      onValueChange={(v) => updateIngredientRow(idx, 'product_id', v)}
                    >
                      <SelectTrigger className="flex-1 h-8 text-sm">
                        <SelectValue placeholder="Producto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(products || []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={ing.quantity_ml || ''}
                      onChange={(e) => updateIngredientRow(idx, 'quantity_ml', parseFloat(e.target.value) || 0)}
                      placeholder="ml"
                      className="w-20 h-8 text-sm shrink-0"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">ml</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => removeIngredientRow(idx)}
                      disabled={formIngredients.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addIngredientRow} className="w-full">
                  <Plus className="mr-1 h-3 w-3" />
                  Agregar ingrediente
                </Button>
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

      {/* Delete confirm dialog */}
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

      {/* Import wizard */}
      <RecipeImportWizard
        open={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onSuccess={(count) => {
          toast({ title: `${count} recetas importadas exitosamente` })
        }}
      />
    </div>
  )
}
