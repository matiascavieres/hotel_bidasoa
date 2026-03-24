/**
 * CasaSanzImportWizard — Wizard para importar recetas desde el Excel CARTA CASA SANZ.
 *
 * Pasos:
 * 1. Subir archivo .xlsx
 * 2. Seleccionar recetas a importar
 * 3. Mapear ingredientes (nombre Excel → producto del catálogo)
 * 4. Confirmar e importar
 */

import { useState, useRef } from 'react'
import { Upload, ChevronRight, ChevronLeft, Loader2, FileSpreadsheet, CheckCircle2, X } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  parseCasaSanzXlsx,
  extractUniqueCasaSanzIngredients,
  type CasaSanzRecipe,
} from '@/lib/casaSanzParser'
import { useBulkCreateRecipes } from '@/hooks/useRecipes'
import { useProducts } from '@/hooks/useProducts'

interface CasaSanzImportWizardProps {
  open: boolean
  onClose: () => void
  onSuccess: (count: number) => void
}

interface IngredientMapping {
  ingredientName: string     // nombre en el Excel
  productId: string | null   // producto del catálogo (null = omitir)
  quantityGr: number         // gr del Excel (editable)
  pricePerKg: number         // precio/kg del Excel (editable)
  skip: boolean
}

type WizardStep = 'upload' | 'review' | 'map' | 'confirm'

export function CasaSanzImportWizard({ open, onClose, onSuccess }: CasaSanzImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload')
  const [parsedRecipes, setParsedRecipes] = useState<CasaSanzRecipe[]>([])
  const [selectedRecipeNames, setSelectedRecipeNames] = useState<Set<string>>(new Set())
  const [mappings, setMappings] = useState<Record<string, IngredientMapping>>({})
  const [filename, setFilename] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const bulkCreate = useBulkCreateRecipes()
  const { data: products } = useProducts()

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
      const recipes = await parseCasaSanzXlsx(file)

      if (recipes.length === 0) {
        toast({
          title: 'No se encontraron recetas',
          description: 'Verifica que el archivo tenga el formato correcto (hojas con columnas INGREDIENTES, GR, PRECIO x KILO)',
          variant: 'destructive',
        })
        return
      }

      setParsedRecipes(recipes)
      setSelectedRecipeNames(new Set(recipes.map((r) => r.name)))
      setFilename(file.name)
      setStep('review')
    } catch (err) {
      console.error('Error parsing xlsx:', err)
      toast({
        title: 'Error al leer el archivo',
        description: 'Asegúrate de que sea un archivo .xlsx válido',
        variant: 'destructive',
      })
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function goToMap() {
    // Extraer ingredientes únicos de las recetas seleccionadas
    const selectedRecipes = parsedRecipes.filter((r) => selectedRecipeNames.has(r.name))
    const uniqueIngredients = extractUniqueCasaSanzIngredients(selectedRecipes)

    const initialMappings: Record<string, IngredientMapping> = {}
    for (const ing of uniqueIngredients) {
      const key = ing.name.toLowerCase().trim()
      initialMappings[key] = {
        ingredientName: ing.name,
        productId: null,
        quantityGr: ing.exampleQuantityGr,
        pricePerKg: ing.examplePricePerKg,
        skip: false,
      }
    }
    setMappings(initialMappings)
    setStep('map')
  }

  function updateMapping(key: string, update: Partial<IngredientMapping>) {
    setMappings((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...update },
    }))
  }

  const mappingList = Object.entries(mappings)
  const mappedCount = mappingList.filter(([, m]) => m.productId && !m.skip).length
  const selectedRecipesList = parsedRecipes.filter((r) => selectedRecipeNames.has(r.name))

  async function handleConfirm() {
    const recipesToCreate = selectedRecipesList.map((recipe) => ({
      name: recipe.name,
      portions: 1,
      ingredients: recipe.ingredients
        .map((ing) => {
          const key = ing.name.toLowerCase().trim()
          const mapping = mappings[key]
          if (!mapping || mapping.skip || !mapping.productId) return null
          return {
            product_id: mapping.productId!,
            quantity_ml: ing.quantity_gr, // stored in quantity_ml column, unit='gr'
            unit: 'gr' as const,
            price_per_kg: mapping.pricePerKg,
          }
        })
        .filter((i): i is NonNullable<typeof i> => i !== null),
    }))

    try {
      const result = await bulkCreate.mutateAsync(recipesToCreate)
      if (result.errors.length > 0) {
        toast({
          title: `${result.created} recetas importadas (${result.errors.length} errores)`,
          description: result.errors.slice(0, 3).join(', '),
          variant: 'destructive',
        })
      } else {
        onSuccess(result.created)
        handleClose()
      }
    } catch {
      toast({ title: 'Error al importar recetas', variant: 'destructive' })
    }
  }

  const stepLabels: Record<WizardStep, string> = {
    upload: 'Subir archivo',
    review: 'Seleccionar recetas',
    map: 'Mapear ingredientes',
    confirm: 'Confirmar',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar recetas desde Excel Casa Sanz
          </DialogTitle>
          <DialogDescription>
            {stepLabels[step]} — {filename || 'Selecciona un archivo .xlsx'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center gap-6 py-10">
              <div className="rounded-full bg-muted p-6">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">Selecciona el archivo CARTA CASA SANZ .xlsx</p>
                <p className="text-sm text-muted-foreground">
                  Cada hoja del archivo se detectará como una receta
                </p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Seleccionar archivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* STEP 2: Review */}
          {step === 'review' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Se detectaron <strong>{parsedRecipes.length}</strong> recetas. Selecciona las que deseas importar.
              </p>
              <div className="space-y-2">
                {parsedRecipes.map((recipe) => (
                  <div
                    key={recipe.name}
                    className="flex items-center gap-3 rounded-md border px-3 py-2 hover:bg-muted/40 cursor-pointer"
                    onClick={() =>
                      setSelectedRecipeNames((prev) => {
                        const next = new Set(prev)
                        if (next.has(recipe.name)) next.delete(recipe.name)
                        else next.add(recipe.name)
                        return next
                      })
                    }
                  >
                    <Checkbox checked={selectedRecipeNames.has(recipe.name)} />
                    <span className="flex-1 text-sm font-medium">{recipe.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {recipe.ingredients.length} ingredientes
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Map */}
          {step === 'map' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Vincula cada ingrediente del Excel con un producto del catálogo.
                Los no vinculados se omitirán.
                <span className="ml-2 font-medium text-foreground">{mappedCount}/{mappingList.length} mapeados</span>
              </p>

              <div className="space-y-2">
                {mappingList.map(([key, mapping]) => (
                  <div key={key} className={`rounded-md border p-3 space-y-2 ${mapping.skip ? 'opacity-40' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{mapping.ingredientName}</span>
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => updateMapping(key, { skip: !mapping.skip })}
                      >
                        {mapping.skip ? 'Incluir' : 'Omitir'}
                      </button>
                    </div>
                    {!mapping.skip && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <Label className="text-xs text-muted-foreground mb-1 block">Producto</Label>
                          <Select
                            value={mapping.productId ?? ''}
                            onValueChange={(v) => updateMapping(key, { productId: v || null })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(products || []).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Cantidad (gr)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={mapping.quantityGr}
                            onChange={(e) => updateMapping(key, { quantityGr: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Precio/kg ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={mapping.pricePerKg}
                            onChange={(e) => updateMapping(key, { pricePerKg: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Listo para importar</span>
                </div>
                <ul className="text-sm space-y-1 pl-7 text-muted-foreground">
                  <li>{selectedRecipesList.length} recetas seleccionadas</li>
                  <li>{mappedCount} ingredientes únicos mapeados</li>
                  <li>Unidad: gramos (gr) — Precio: por kilo</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Los ingredientes sin mapear o marcados como "Omitir" no se importarán.
                Podrás editar cada receta después de importar.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === 'review') setStep('upload')
              else if (step === 'map') setStep('review')
              else if (step === 'confirm') setStep('map')
              else handleClose()
            }}
            disabled={bulkCreate.isPending}
          >
            {step === 'upload' ? (
              <>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </>
            ) : (
              <>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Atrás
              </>
            )}
          </Button>

          {step === 'upload' ? null : step === 'confirm' ? (
            <Button onClick={handleConfirm} disabled={bulkCreate.isPending}>
              {bulkCreate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar {selectedRecipesList.length} recetas
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (step === 'review') {
                  if (selectedRecipeNames.size === 0) {
                    toast({ title: 'Selecciona al menos una receta', variant: 'destructive' })
                    return
                  }
                  goToMap()
                } else if (step === 'map') {
                  setStep('confirm')
                }
              }}
            >
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
