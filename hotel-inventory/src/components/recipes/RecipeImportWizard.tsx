/**
 * RecipeImportWizard — Multi-step dialog for importing cocktail recipes from CSV
 *
 * Steps:
 * 1. Upload CSV file
 * 2. Review detected recipes (select which to import)
 * 3. Map ingredients to system products
 * 4. Confirm and save
 */

import { useState, useRef } from 'react'
import { Upload, ChevronRight, ChevronLeft, Loader2, FileText, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { parseRecipeCSV, extractUniqueIngredients } from '@/lib/recipeParser'
import { RecipeIngredientMapper, type IngredientMapping } from './RecipeIngredientMapper'
import { useBulkCreateRecipes } from '@/hooks/useRecipes'
import type { ParsedRecipe } from '@/lib/recipeParser'

interface RecipeImportWizardProps {
  open: boolean
  onClose: () => void
  onSuccess: (count: number) => void
}

type WizardStep = 'upload' | 'review' | 'map' | 'confirm'

export function RecipeImportWizard({ open, onClose, onSuccess }: RecipeImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload')
  const [parsedRecipes, setParsedRecipes] = useState<ParsedRecipe[]>([])
  const [selectedRecipeNames, setSelectedRecipeNames] = useState<Set<string>>(new Set())
  const [mappings, setMappings] = useState<Record<string, IngredientMapping>>({})
  const [filename, setFilename] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const bulkCreate = useBulkCreateRecipes()

  function handleClose() {
    setStep('upload')
    setParsedRecipes([])
    setSelectedRecipeNames(new Set())
    setMappings({})
    setFilename('')
    onClose()
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const recipes = parseRecipeCSV(text)

      if (recipes.length === 0) {
        toast({
          title: 'No se encontraron recetas',
          description: 'Verifica que el archivo tenga el formato correcto (columnas: Coctel, Medidas)',
          variant: 'destructive',
        })
        return
      }

      setParsedRecipes(recipes)
      setSelectedRecipeNames(new Set(recipes.map((r) => r.name)))
      setFilename(file.name)
      setStep('review')
    } catch {
      toast({
        title: 'Error al leer el archivo',
        description: 'Asegúrate de que sea un archivo CSV válido',
        variant: 'destructive',
      })
    }
  }

  function handleReviewNext() {
    // Initialize mappings with auto-detected values
    const selectedRecipes = parsedRecipes.filter((r) => selectedRecipeNames.has(r.name))
    const uniqueIngs = extractUniqueIngredients(selectedRecipes)

    const initialMappings: Record<string, IngredientMapping> = {}
    for (const ing of uniqueIngs) {
      const key = ing.name.toLowerCase()
      initialMappings[key] = {
        ingredientName: ing.name,
        productId: null,
        quantityMl: ing.exampleQuantityMl,
        skip: !ing.isLiquid, // auto-skip non-liquid
      }
    }
    setMappings(initialMappings)
    setStep('map')
  }

  async function handleConfirm() {
    const selectedRecipes = parsedRecipes.filter((r) => selectedRecipeNames.has(r.name))

    // Build recipe data from selected recipes + mappings
    const recipesToCreate = selectedRecipes.map((recipe) => {
      const ingredients = recipe.rawIngredients
        .map((ing) => {
          const key = ing.ingredientName.toLowerCase()
          const mapping = mappings[key]
          if (!mapping || mapping.skip || !mapping.productId) return null
          return {
            product_id: mapping.productId,
            quantity_ml: mapping.quantityMl,
            unit: 'ml' as const,
          }
        })
        .filter((i): i is { product_id: string; quantity_ml: number; unit: 'ml' } => i !== null)

      return { name: recipe.name, ingredients }
    })

    try {
      const result = await bulkCreate.mutateAsync(recipesToCreate)

      if (result.errors.length > 0) {
        toast({
          title: `${result.created} recetas creadas con ${result.errors.length} error(es)`,
          description: result.errors.slice(0, 3).join('; '),
          variant: 'destructive',
        })
      } else {
        toast({
          title: `${result.created} recetas importadas`,
          description: 'Las recetas están disponibles en el catálogo',
        })
      }

      onSuccess(result.created)
      handleClose()
    } catch {
      toast({
        title: 'Error al guardar recetas',
        variant: 'destructive',
      })
    }
  }

  const selectedRecipes = parsedRecipes.filter((r) => selectedRecipeNames.has(r.name))
  const uniqueIngs = extractUniqueIngredients(selectedRecipes)
  const mappedCount = Object.values(mappings).filter((m) => m.skip || m.productId).length

  const stepTitle: Record<WizardStep, string> = {
    upload: 'Importar recetas desde CSV',
    review: `${parsedRecipes.length} recetas detectadas`,
    map: 'Mapear ingredientes a productos',
    confirm: 'Confirmar importación',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{stepTitle[step]}</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Sube el CSV exportado desde Excel con las recetas de la carta'}
            {step === 'review' && `Selecciona las recetas que deseas importar de "${filename}"`}
            {step === 'map' && `Asigna cada ingrediente a un producto del catálogo (${mappedCount}/${uniqueIngs.length} mapeados)`}
            {step === 'confirm' && `Se crearán ${selectedRecipeNames.size} recetas en el sistema`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="rounded-full bg-muted p-6">
                <Upload className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">Selecciona el archivo CSV de recetas</p>
                <p className="text-sm text-muted-foreground">
                  Formato esperado: columnas Coctel, Medidas (ingredientes separados por línea)
                </p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()}>
                <FileText className="mr-2 h-4 w-4" />
                Elegir archivo CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* STEP 2: Review recipes */}
          {step === 'review' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedRecipeNames.size} de {parsedRecipes.length} seleccionadas
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedRecipeNames.size === parsedRecipes.length) {
                      setSelectedRecipeNames(new Set())
                    } else {
                      setSelectedRecipeNames(new Set(parsedRecipes.map((r) => r.name)))
                    }
                  }}
                >
                  {selectedRecipeNames.size === parsedRecipes.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </Button>
              </div>
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {parsedRecipes.map((recipe) => {
                  const isSelected = selectedRecipeNames.has(recipe.name)
                  const liquidIngs = recipe.rawIngredients.filter((i) => i.isLiquid)
                  return (
                    <label
                      key={recipe.name}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                        isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(v) => {
                          const updated = new Set(selectedRecipeNames)
                          if (v) updated.add(recipe.name)
                          else updated.delete(recipe.name)
                          setSelectedRecipeNames(updated)
                        }}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{recipe.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {recipe.rawIngredients.slice(0, 4).map((i) => i.ingredientName).join(', ')}
                          {recipe.rawIngredients.length > 4 ? '...' : ''}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {liquidIngs.length} líq.
                      </Badge>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Map ingredients */}
          {step === 'map' && (
            <RecipeIngredientMapper
              uniqueIngredients={uniqueIngs}
              mappings={mappings}
              onChange={setMappings}
            />
          )}

          {/* STEP 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recetas a crear</span>
                  <Badge variant="outline">{selectedRecipeNames.size}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ingredientes mapeados</span>
                  <Badge variant="outline">
                    {Object.values(mappings).filter((m) => m.productId).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ingredientes omitidos</span>
                  <Badge variant="secondary">
                    {Object.values(mappings).filter((m) => m.skip).length}
                  </Badge>
                </div>
              </div>
              <div className="rounded-md bg-muted/50 p-3 space-y-1 max-h-48 overflow-y-auto">
                {Array.from(selectedRecipeNames).map((name) => {
                  const recipe = parsedRecipes.find((r) => r.name === name)!
                  const validIngs = recipe.rawIngredients.filter((ing) => {
                    const m = mappings[ing.ingredientName.toLowerCase()]
                    return m?.productId
                  })
                  return (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span>{name}</span>
                      <span className="text-xs text-muted-foreground">
                        {validIngs.length} ingrediente{validIngs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between pt-2 border-t">
          <div>
            {step !== 'upload' && (
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 'review') setStep('upload')
                  else if (step === 'map') setStep('review')
                  else if (step === 'confirm') setStep('map')
                }}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Atrás
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            {step === 'review' && (
              <Button onClick={handleReviewNext} disabled={selectedRecipeNames.size === 0}>
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === 'map' && (
              <Button onClick={() => setStep('confirm')}>
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === 'confirm' && (
              <Button
                onClick={handleConfirm}
                disabled={bulkCreate.isPending || selectedRecipeNames.size === 0}
              >
                {bulkCreate.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Guardar {selectedRecipeNames.size} recetas
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
