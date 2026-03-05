import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, Loader2, History, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { parseSalesFile, groupSalesByRecipe } from '@/lib/salesParser'
import { useRecipes } from '@/hooks/useRecipes'
import { useSalesImports, matchSalesWithRecipes, useProcessSalesImport } from '@/hooks/useSalesImport'
import { SalesImportPreview } from '@/components/recipes/SalesImportPreview'
import { useAuth } from '@/context/AuthContext'
import type { SalesImportPreview as Preview } from '@/hooks/useSalesImport'

type ImportStep = 'upload' | 'preview' | 'done'

export default function SalesImport() {
  const { user } = useAuth()
  const { data: recipes } = useRecipes()
  const { data: imports } = useSalesImports()
  const processImport = useProcessSalesImport()
  const { toast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<ImportStep>('upload')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [filename, setFilename] = useState('')
  const [importDate, setImportDate] = useState('')
  const [totalRows, setTotalRows] = useState(0)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [rawSalesRows, setRawSalesRows] = useState<{ receta: string; cantidad: number; grupo: string; familia: string }[]>([])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsingFile(true)
    try {
      const parsed = await parseSalesFile(file)
      const grouped = groupSalesByRecipe(parsed.rows)

      setFilename(file.name)
      setImportDate(parsed.inferredDate || new Date().toISOString().split('T')[0])
      setTotalRows(grouped.length)

      // Save raw rows for sales_monthly population
      setRawSalesRows(parsed.rows.map(r => ({
        receta: r.receta,
        cantidad: r.cantidad,
        grupo: r.grupo,
        familia: r.familia,
      })))

      // Match with system recipes (empty array if no recipes — analytics-only mode)
      const computedPreview = matchSalesWithRecipes(grouped, recipes ?? [])
      setPreview(computedPreview)
      setStep('preview')
    } catch (err) {
      toast({
        title: 'Error al procesar el archivo',
        description: 'Asegúrate de que sea el archivo XLS exportado desde FNS Manager',
        variant: 'destructive',
      })
    } finally {
      setIsParsingFile(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleConfirm() {
    if (!preview || !user) return

    try {
      await processImport.mutateAsync({
        preview,
        filename,
        importDate,
        importedBy: user.id,
        totalRows,
        salesRows: rawSalesRows,
      })
      toast({
        title: 'Importación completada',
        description: preview.stockChanges.length > 0
          ? `Stock actualizado: ${preview.stockChanges.length} productos descontados`
          : 'Ventas registradas en el historial (sin deducción de stock)',
      })
      setStep('done')
    } catch {
      toast({
        title: 'Error al importar ventas',
        variant: 'destructive',
      })
    }
  }

  function handleReset() {
    setStep('upload')
    setPreview(null)
    setFilename('')
    setImportDate('')
    setTotalRows(0)
    setRawSalesRows([])
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Importar Ventas</h1>
        <p className="text-muted-foreground">
          Sube el reporte diario de FNS Manager para descontar stock automáticamente del bar
        </p>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="rounded-full bg-muted p-6">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium">Subir archivo de ventas de FNS</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Exporta el reporte desde FNS Manager en formato XLS y súbelo aquí.
                    El sistema descontará automáticamente los ingredientes de cada cóctel vendido.
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsingFile}
                >
                  {isParsingFile ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {isParsingFile ? 'Procesando...' : 'Seleccionar archivo XLS'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx,.html,.htm,.csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {!recipes?.length && (
                <div className="flex items-center gap-2 rounded-md bg-muted p-3 mt-4">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Sin recetas configuradas — las ventas se registrarán en el historial pero no se descontará stock del bar.{' '}
                    <a href="/admin/recetas" className="underline font-medium">
                      Configurar recetas
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import history */}
          {imports && imports.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Importaciones recientes
              </h2>
              <div className="rounded-md border divide-y">
                {imports.slice(0, 10).map((imp) => (
                  <div key={imp.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{imp.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {imp.importer
                          ? (imp.importer as { full_name: string }).full_name
                          : 'Usuario'}{' '}
                        · {formatDate(imp.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant="success" className="text-xs">
                        {imp.matched_recipes} mapeadas
                      </Badge>
                      {imp.unmatched_recipes > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {imp.unmatched_recipes} omitidas
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* File info bar */}
          <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">{filename}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="importDate" className="text-xs whitespace-nowrap">Fecha del reporte:</Label>
                <Input
                  id="importDate"
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className="h-7 text-xs w-36"
                />
              </div>
            </div>
          </div>

          {preview.matched.length === 0 && (
            <div className="flex items-center gap-2 rounded-md bg-muted p-3">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Solo historial de ventas — no se modificará el stock (0 recetas mapeadas). Los datos quedarán disponibles en la sección Ventas.
              </p>
            </div>
          )}

          <SalesImportPreview preview={preview} />

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleReset}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processImport.isPending || totalRows === 0}
            >
              {processImport.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmar e importar
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="rounded-full bg-success/10 p-6">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-xl font-bold">¡Importación completada!</p>
            <p className="text-muted-foreground">
              El stock de los bares ha sido actualizado según las ventas importadas.
            </p>
          </div>
          <Button onClick={handleReset}>
            <Upload className="mr-2 h-4 w-4" />
            Importar otro archivo
          </Button>
        </div>
      )}
    </div>
  )
}
