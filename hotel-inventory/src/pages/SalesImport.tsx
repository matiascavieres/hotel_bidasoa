import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, Loader2, History, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { parseSalesFile, groupSalesByRecipe, mapLocationFromFNS } from '@/lib/salesParser'
import { useRecipes } from '@/hooks/useRecipes'
import { useSalesImports, matchSalesWithRecipes, useProcessSalesImport } from '@/hooks/useSalesImport'
import { SalesImportPreview } from '@/components/recipes/SalesImportPreview'
import { useAuth } from '@/context/AuthContext'
import { DatePickerButton } from '@/components/ui/date-picker'
import type { SalesImportPreview as Preview } from '@/hooks/useSalesImport'
import type { SalesImport } from '@/types'

type ImportStep = 'upload' | 'preview' | 'done'

// ── Import history row with collapsible detail ─────────────────────────────────

interface ImportRowProps {
  imp: SalesImport
  formatDate: (s: string) => string
}

function ImportRow({ imp, formatDate }: ImportRowProps) {
  const [open, setOpen] = useState(false)

  // Extract top-10 sales from details (matched + unmatched by cantidad)
  const details = imp.details as {
    matched?: { recetaFNS: string; cantidad: number; location: string }[]
    unmatched?: { recetaFNS: string; cantidad: number; puntoDeVenta?: string }[]
  } | null

  const rows = [
    ...(details?.matched  ?? []).map(r => ({ receta: r.recetaFNS, cantidad: r.cantidad, location: r.location, matched: true })),
    ...(details?.unmatched ?? []).map(r => ({ receta: r.recetaFNS, cantidad: r.cantidad, location: '', matched: false })),
  ]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10)

  const locationLabel: Record<string, string> = {
    bar_casa_sanz:     'Casa Sanz',
    bar_hotel_bidasoa: 'Bidasoa',
    '':                '—',
  }

  return (
    <div className="divide-y">
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => rows.length > 0 && setOpen(o => !o)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            disabled={rows.length === 0}
            title={rows.length > 0 ? 'Ver top 10 ventas' : undefined}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="min-w-0">
            <p className="font-medium truncate">{imp.filename}</p>
            <p className="text-xs text-muted-foreground">
              {imp.importer
                ? (imp.importer as { full_name: string }).full_name
                : 'Usuario'}{' '}
              · {formatDate(imp.created_at)}
              {imp.import_date ? ` · ${formatDate(imp.import_date)}` : ''}
            </p>
          </div>
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

      {open && rows.length > 0 && (
        <div className="bg-muted/30 px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Top {rows.length} recetas</p>
          <div className="space-y-1">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                  <span className="truncate">{r.receta}</span>
                  {!r.matched && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">sin receta</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-muted-foreground text-[11px]">{locationLabel[r.location] ?? r.location}</span>
                  <span className="font-medium tabular-nums">{r.cantidad}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

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
  const [importDateFrom, setImportDateFrom] = useState('')
  const [importDateTo,   setImportDateTo]   = useState('')
  const [totalRows, setTotalRows] = useState(0)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [deductStock, setDeductStock] = useState(true)
  const [rawSalesRows, setRawSalesRows] = useState<{ receta: string; cantidad: number; importeUnitario: number; grupo: string; familia: string; location: string }[]>([])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setIsParsingFile(true)
    try {
      const allRows: { receta: string; cantidad: number; grupo: string; familia: string; puntoDeVenta: string }[] = []
      let inferredFrom = ''
      let inferredTo   = ''

      for (const file of files) {
        const parsed = await parseSalesFile(file)
        allRows.push(...parsed.rows)
        if (!inferredFrom && parsed.inferredDate)   inferredFrom = parsed.inferredDate
        if (!inferredTo   && parsed.inferredToDate) inferredTo   = parsed.inferredToDate
      }

      const grouped = groupSalesByRecipe(allRows)
      const today = new Date().toISOString().split('T')[0]

      setFilename(files.length > 1 ? files.map(f => f.name).join(' + ') : files[0].name)
      setImportDateFrom(inferredFrom || today)
      setImportDateTo(inferredTo || inferredFrom || today)
      setTotalRows(grouped.length)

      setRawSalesRows(allRows.map(r => ({
        receta:          r.receta,
        cantidad:        r.cantidad,
        importeUnitario: r.importeUnitario,
        grupo:           r.grupo,
        familia:         r.familia,
        location:        mapLocationFromFNS(r.puntoDeVenta) ?? '',
      })))

      const computedPreview = matchSalesWithRecipes(grouped, recipes ?? [])
      setPreview(computedPreview)
      setStep('preview')
    } catch {
      toast({
        title: 'Error al procesar el archivo',
        description: 'Asegúrate de que sea el archivo XLS exportado desde FNS Manager',
        variant: 'destructive',
      })
    } finally {
      setIsParsingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleConfirm() {
    if (!preview || !user) return

    try {
      await processImport.mutateAsync({
        preview,
        filename,
        importDate: importDateFrom,
        importedBy: user.id,
        totalRows,
        salesRows: rawSalesRows,
        deductStock,
      })
      toast({
        title: 'Importación completada',
        description: deductStock && preview.stockChanges.length > 0
          ? `Stock actualizado: ${preview.stockChanges.length} productos descontados`
          : 'Ventas registradas en el historial',
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
    setImportDateFrom('')
    setImportDateTo('')
    setTotalRows(0)
    setRawSalesRows([])
    setDeductStock(true)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Check if any existing import overlaps with the current date range
  const duplicateImports = imports?.filter(imp => imp.import_date === importDateFrom) ?? []
  const hasDuplicate = duplicateImports.length > 0

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
                  <p className="font-medium">Subir archivos de ventas de FNS</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Exporta el reporte desde FNS Manager en formato XLS y súbelo aquí.
                    Puedes seleccionar hasta 2 archivos a la vez (uno por restaurante).
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
                  {isParsingFile ? 'Procesando...' : 'Seleccionar archivos XLS'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx,.html,.htm,.csv"
                  multiple
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
                  <ImportRow key={imp.id} imp={imp} formatDate={formatDate} />
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Período:</span>
              <DatePickerButton
                value={importDateFrom}
                onChange={v => {
                  setImportDateFrom(v)
                  if (importDateTo && v > importDateTo) setImportDateTo(v)
                }}
              />
              <span className="text-xs text-muted-foreground">→</span>
              <DatePickerButton
                value={importDateTo}
                onChange={setImportDateTo}
                min={importDateFrom}
              />
            </div>
          </div>

          {/* Duplicate warning */}
          {hasDuplicate && (
            <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 p-3">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Ya existe una importación para esta fecha ({duplicateImports.length} archivo{duplicateImports.length > 1 ? 's' : ''}).
                Si continúas, los datos existentes se <strong>reemplazarán</strong>.
              </p>
            </div>
          )}

          {preview.matched.length === 0 && (
            <div className="flex items-center gap-2 rounded-md bg-muted p-3">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Solo historial de ventas — no se modificará el stock (0 recetas mapeadas). Los datos quedarán disponibles en la sección Ventas.
              </p>
            </div>
          )}

          <SalesImportPreview preview={preview} />

          {/* Stock deduction toggle */}
          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch
              id="deductStock"
              checked={deductStock}
              onCheckedChange={setDeductStock}
            />
            <Label htmlFor="deductStock" className="text-sm cursor-pointer">
              {deductStock
                ? 'Descontar stock del bar al confirmar'
                : 'Solo registrar ventas (sin descontar stock)'}
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleReset}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processImport.isPending || totalRows === 0}
              variant={hasDuplicate ? 'destructive' : 'default'}
            >
              {processImport.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {hasDuplicate ? 'Reemplazar e importar' : 'Confirmar e importar'}
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
              {deductStock
                ? 'El stock de los bares ha sido actualizado según las ventas importadas.'
                : 'Las ventas han sido registradas para análisis sin modificar el stock.'}
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
