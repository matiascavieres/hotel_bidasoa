import { useState, useMemo, useRef } from 'react'
import { Plus, Edit2, Upload, Search, Loader2, LayoutList, LayoutGrid, FileText, CheckCircle2, AlertTriangle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MultiSelect } from '@/components/ui/multi-select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useProducts, useCategories, useCreateProduct, useUpdateProduct, useCreateCategory } from '@/hooks/useInventory'
import { useCreateLog } from '@/hooks/useLogs'
import { useAuth } from '@/context/AuthContext'
import { CatalogStockCoverage } from '@/components/inventory/CatalogStockCoverage'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { parseWineCSV, type WineImportResult } from '@/utils/importWines'

interface Product {
  id: string
  code: string
  name: string
  category_id: string
  category: { id: string; name: string } | null
  format_ml: number | null
  sale_price: number | null
  price_per_kg?: number | null
}

// ─── CategoryCombobox ─────────────────────────────────────────────────────────

interface CategoryComboboxProps {
  categories: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  isCreatingCategory: boolean
  setIsCreatingCategory: (v: boolean) => void
  newCategoryName: string
  setNewCategoryName: (v: string) => void
  onCreateCategory: () => void
  isPending: boolean
}

function CategoryCombobox({
  categories,
  value,
  onChange,
  isCreatingCategory,
  setIsCreatingCategory,
  newCategoryName,
  setNewCategoryName,
  onCreateCategory,
  isPending,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedCat = categories.find((c) => c.id === value)

  const filtered = categories.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  if (isCreatingCategory) {
    return (
      <div className="flex gap-2 items-center">
        <Input
          autoFocus
          placeholder="Nombre de nueva categoría"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCreateCategory()
            if (e.key === 'Escape') { setIsCreatingCategory(false); setNewCategoryName('') }
          }}
          className="flex-1"
        />
        <Button type="button" size="sm" onClick={onCreateCategory} disabled={isPending || !newCategoryName.trim()}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
          Crear
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { setIsCreatingCategory(false); setNewCategoryName('') }}>
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        value={open ? search : (selectedCat?.name ?? search)}
        onChange={(e) => {
          setSearch(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={() => {
          setSearch('')
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar categoría..."
        className={selectedCat && !open ? 'text-foreground font-medium' : ''}
      />
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-full rounded-md border bg-popover shadow-lg p-2">
          <div className="grid grid-cols-3 gap-1 max-h-52 overflow-y-auto mb-2">
            {filtered.length === 0 ? (
              <p className="col-span-3 text-sm text-muted-foreground text-center py-3">Sin resultados</p>
            ) : (
              filtered.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={cn(
                    'text-left text-sm px-2 py-1.5 rounded border transition-colors truncate',
                    cat.id === value
                      ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                      : 'border-transparent hover:bg-accent hover:border-border'
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onChange(cat.id)
                    setSearch('')
                    setOpen(false)
                  }}
                  title={cat.name}
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              setOpen(false)
              setIsCreatingCategory(true)
            }}
            className="w-full text-sm text-center py-1.5 rounded border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors font-medium"
          >
            + Nueva categoría
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminCatalog() {
  const { toast } = useToast()
  const { profile } = useAuth()
  const createLog = useCreateLog()
  const isAdmin = profile?.role === 'admin'
  const [searchQuery, setSearchQuery] = useState('')
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('catalog-view-mode') as 'list' | 'grid') || 'list'
  })
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    categoryId: '',
    format_ml: 0,
    sale_price: 0,
    price_per_kg: 0,
  })

  const queryClient = useQueryClient()
  const { data: products, isLoading: productsLoading, error: productsError } = useProducts()
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const createCategoryMutation = useCreateCategory()

  // Import state
  const importFileRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<WineImportResult | null>(null)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)
  const [importDone, setImportDone] = useState<{ success: number; errors: string[] } | null>(null)

  const isMutating = createProduct.isPending || updateProduct.isPending

  // Get unique category names from products for filter chips
  const allCategoryNames = useMemo(() => {
    if (!products) return []
    return [...new Set(
      (products as Product[]).map(p => p.category?.name || 'Sin categoria')
    )].sort()
  }, [products])

  const filteredProducts = (products || []).filter((product) => {
    const p = product as Product
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(p.category?.name || 'Sin categoria')
    return matchesSearch && matchesCategory
  }) as Product[]

  const handleOpenProductModal = (product?: Product) => {
    setIsCreatingCategory(false)
    setNewCategoryName('')
    if (product) {
      setEditingProduct(product)
      setFormData({
        code: product.code,
        name: product.name,
        categoryId: product.category_id,
        format_ml: product.format_ml || 0,
        sale_price: product.sale_price || 0,
        price_per_kg: product.price_per_kg || 0,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        code: '',
        name: '',
        categoryId: '',
        format_ml: 0,
        sale_price: 0,
        price_per_kg: 0,
      })
    }
    setIsProductModalOpen(true)
  }

  const handleSubmitProduct = async () => {
    if (!formData.code || !formData.name || !formData.categoryId) {
      toast({
        title: 'Error',
        description: 'Completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    if (editingProduct) {
      updateProduct.mutate(
        {
          id: editingProduct.id,
          code: formData.code,
          name: formData.name,
          categoryId: formData.categoryId,
          formatMl: formData.format_ml,
          salePrice: formData.sale_price || undefined,
          pricePerKg: formData.price_per_kg || undefined,
        },
        {
          onSuccess: () => {
            // Log the product edit to audit history
            if (profile?.id && editingProduct) {
              const changes: Record<string, { from: unknown; to: unknown }> = {}
              if (editingProduct.code !== formData.code) {
                changes.code = { from: editingProduct.code, to: formData.code }
              }
              if (editingProduct.name !== formData.name) {
                changes.name = { from: editingProduct.name, to: formData.name }
              }
              if (editingProduct.category_id !== formData.categoryId) {
                const oldCat = editingProduct.category?.name || editingProduct.category_id
                const newCat = categories?.find(c => c.id === formData.categoryId)?.name || formData.categoryId
                changes.category = { from: oldCat, to: newCat }
              }
              if ((editingProduct.format_ml || 0) !== formData.format_ml) {
                changes.format_ml = { from: editingProduct.format_ml, to: formData.format_ml }
              }
              if ((editingProduct.sale_price || 0) !== (formData.sale_price || 0)) {
                changes.sale_price = { from: editingProduct.sale_price, to: formData.sale_price }
              }

              createLog.mutate({
                userId: profile.id,
                action: 'product_updated',
                entityType: 'product',
                entityId: editingProduct.id,
                details: ({
                  product_name: formData.name,
                  product_code: formData.code,
                  changes,
                }) as unknown as import('@/types/database').Json,
              })
            }

            toast({
              title: 'Producto actualizado',
              description: `${formData.name} ha sido actualizado`,
            })
            setIsProductModalOpen(false)
          },
          onError: (error) => {
            toast({
              title: 'Error',
              description: error.message || 'No se pudo actualizar el producto',
              variant: 'destructive',
            })
          },
        }
      )
    } else {
      createProduct.mutate(
        {
          code: formData.code,
          name: formData.name,
          categoryId: formData.categoryId,
          formatMl: formData.format_ml,
          salePrice: formData.sale_price || undefined,
          pricePerKg: formData.price_per_kg || undefined,
        },
        {
          onSuccess: () => {
            toast({
              title: 'Producto creado',
              description: `${formData.name} ha sido creado`,
            })
            setIsProductModalOpen(false)
          },
          onError: (error) => {
            toast({
              title: 'Error',
              description: error.message || 'No se pudo crear el producto',
              variant: 'destructive',
            })
          },
        }
      )
    }
  }

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    try {
      const newCat = await createCategoryMutation.mutateAsync(name)
      setFormData(prev => ({ ...prev, categoryId: newCat.id }))
      setNewCategoryName('')
      setIsCreatingCategory(false)
      toast({ title: 'Categoría creada', description: `"${name}" fue creada y seleccionada.` })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear la categoría'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    }
  }

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !categories) return
    setImportFile(file)
    setImportDone(null)
    setImportProgress(null)

    try {
      const buffer = await file.arrayBuffer()
      const existingProducts = (products || []).map(p => ({
        code: (p as Product).code,
        name: (p as Product).name,
      }))
      const result = parseWineCSV(buffer, categories, existingProducts)
      setImportPreview(result)
    } catch (err) {
      toast({
        title: 'Error al leer archivo',
        description: String(err),
        variant: 'destructive',
      })
      setImportFile(null)
      setImportPreview(null)
    }
  }

  const handleImport = async () => {
    if (!importPreview || importPreview.products.length === 0) return
    const products = importPreview.products
    setImportProgress({ current: 0, total: products.length })
    setImportDone(null)

    let success = 0
    const errors: string[] = []

    // Insert products in batches of 20
    const batchSize = 20
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      const rows = batch.map(p => ({
        code: p.code,
        name: p.name,
        category_id: p.categoryId,
        format_ml: p.formatMl,
        sale_price: p.salePrice || null,
        is_active: true,
      }))

      const { data, error } = await supabase
        .from('products')
        .insert(rows)
        .select('id')

      if (error) {
        errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      } else {
        success += data.length

        // Create inventory records (stock=0) in bodega for new products
        const inventoryRows = data.map((p: { id: string }) => ({
          product_id: p.id,
          location: 'bodega' as const,
          quantity_ml: 0,
          min_stock_ml: 0,
        }))

        const { error: invError } = await supabase
          .from('inventory')
          .insert(inventoryRows)

        if (invError) {
          errors.push(`Inventario lote ${Math.floor(i / batchSize) + 1}: ${invError.message}`)
        }
      }

      setImportProgress({ current: Math.min(i + batchSize, products.length), total: products.length })
    }

    // Invalidate queries once at the end
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })

    setImportDone({ success, errors })
    setImportProgress(null)

    // Log the import
    if (profile?.id) {
      createLog.mutate({
        userId: profile.id,
        action: 'sales_import' as const,
        entityType: 'product',
        entityId: 'bulk_import',
        details: ({
          type: 'wine_csv_import',
          total_products: products.length,
          success_count: success,
          error_count: errors.length,
        }) as unknown as import('@/types/database').Json,
      })
    }

    if (errors.length === 0) {
      toast({
        title: 'Importación completada',
        description: `${success} productos importados exitosamente`,
      })
    } else {
      toast({
        title: 'Importación parcial',
        description: `${success} importados, ${errors.length} errores`,
        variant: 'destructive',
      })
    }
  }

  const handleCloseImport = () => {
    setIsImportModalOpen(false)
    setImportFile(null)
    setImportPreview(null)
    setImportProgress(null)
    setImportDone(null)
    if (importFileRef.current) importFileRef.current.value = ''
  }

  if (productsLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (productsError) {
    return (
      <div className="py-8 text-center text-destructive">
        Error al cargar los productos
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalogo de Productos</h1>
          <p className="text-muted-foreground">
            {products?.length || 0} productos en el catalogo
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
          )}
          <Button onClick={() => handleOpenProductModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <Tabs defaultValue="productos">
        <TabsList>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="cobertura">Cobertura Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="productos" className="space-y-4 mt-4">
          {/* Search + View Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => { setViewMode('list'); localStorage.setItem('catalog-view-mode', 'list') }}
                title="Vista lista"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => { setViewMode('grid'); localStorage.setItem('catalog-view-mode', 'grid') }}
                title="Vista cuadrícula"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <MultiSelect
              options={allCategoryNames}
              selected={selectedCategories}
              onChange={setSelectedCategories}
              placeholder="Todas las categorías"
              searchPlaceholder="Buscar categoría..."
              countLabel="categorías"
              className="w-[220px]"
            />
          </div>

          {/* List view */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <Card key={product.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{product.name}</p>
                        <Badge variant="outline">{product.category?.name || 'Sin categoria'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {product.code} • {product.format_ml}ml
                        {product.sale_price && ` • $${product.sale_price.toLocaleString()}`}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenProductModal(product)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Grid view */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className={isAdmin ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""}
                  onClick={isAdmin ? () => handleOpenProductModal(product) : undefined}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="text-[10px]">
                        {product.category?.name || 'Sin cat.'}
                      </Badge>
                      {isAdmin && <Edit2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </div>
                    <p className="font-medium text-sm leading-tight">{product.name}</p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{product.code}</p>
                      <p>{product.format_ml}ml</p>
                      {product.sale_price && (
                        <p className="font-medium text-foreground">${product.sale_price.toLocaleString()}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No se encontraron productos
            </div>
          )}
        </TabsContent>

        <TabsContent value="cobertura" className="mt-4">
          <CatalogStockCoverage />
        </TabsContent>
      </Tabs>

      {/* Product Form Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Modifica los datos del producto'
                : 'Completa los datos para crear un nuevo producto'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Row 1: Código + Nombre */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ej: ABR-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Arroz grano corto"
                />
              </div>
            </div>

            {/* Row 2: Categoría — combobox con búsqueda */}
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <CategoryCombobox
                categories={categories || []}
                value={formData.categoryId}
                onChange={(id) => setFormData({ ...formData, categoryId: id })}
                isCreatingCategory={isCreatingCategory}
                setIsCreatingCategory={setIsCreatingCategory}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                onCreateCategory={handleCreateCategory}
                isPending={createCategoryMutation.isPending}
              />
            </div>

            {/* Row 3: Formato + Precio venta + Precio x kg */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="format_ml">Cantidad (ml / gr)</Label>
                <Input
                  id="format_ml"
                  type="number"
                  value={formData.format_ml}
                  onChange={(e) => setFormData({ ...formData, format_ml: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_price">Precio venta ($)</Label>
                <Input
                  id="sale_price"
                  type="number"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_per_kg">Precio x kg/lt ($)</Label>
                <Input
                  id="price_per_kg"
                  type="number"
                  value={formData.price_per_kg}
                  onChange={(e) => setFormData({ ...formData, price_per_kg: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitProduct} disabled={isMutating}>
              {isMutating ? 'Guardando...' : editingProduct ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={(open) => { if (!open) handleCloseImport() }}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Productos</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV con columnas: nombre, cepa, valor_venta_bruto
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* File input */}
            {!importDone && (
              <div className="rounded-lg border-2 border-dashed p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Selecciona un archivo CSV o XLSX
                </p>
                <Input
                  ref={importFileRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="mt-3"
                  onChange={handleImportFileChange}
                  disabled={!!importProgress}
                />
              </div>
            )}

            {/* Preview */}
            {importPreview && !importDone && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{importFile?.name}</span>
                </div>

                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">
                    {importPreview.products.length} productos listos para importar
                  </p>
                  {/* Category summary */}
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(importPreview.products.map(p => p.categoryName))].map(cat => {
                      const count = importPreview.products.filter(p => p.categoryName === cat).length
                      return (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {cat} ({count})
                        </Badge>
                      )
                    })}
                  </div>
                  {/* Format summary */}
                  {importPreview.products.some(p => p.formatMl !== 750) && (
                    <p className="text-xs text-muted-foreground">
                      Formatos especiales: {importPreview.products
                        .filter(p => p.formatMl !== 750)
                        .map(p => `${p.name} (${p.formatMl}ml)`)
                        .join(', ')}
                    </p>
                  )}
                </div>

                {/* Skipped (already existing) products */}
                {importPreview.skippedProducts.length > 0 && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20 p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-400">
                        {importPreview.skippedProducts.length} productos ya existentes (se omitiran)
                      </span>
                    </div>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5 max-h-32 overflow-y-auto">
                      {importPreview.skippedProducts.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {importPreview.warnings.length > 0 && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20 p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Advertencias</span>
                    </div>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-0.5">
                      {importPreview.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Progress bar */}
            {importProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importando...</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Done */}
            {importDone && (
              <div className="rounded-md border p-4 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
                <p className="font-medium">Importación finalizada</p>
                <p className="text-sm text-muted-foreground">
                  {importDone.success} productos importados con inventario en bodega (stock 0)
                </p>
                {importDone.errors.length > 0 && (
                  <div className="text-left mt-2">
                    <p className="text-sm font-medium text-destructive">Errores:</p>
                    <ul className="text-xs text-destructive space-y-0.5">
                      {importDone.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImport}>
              {importDone ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!importDone && (
              <Button
                onClick={handleImport}
                disabled={!importPreview || importPreview.products.length === 0 || !!importProgress}
              >
                {importProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar {importPreview?.products.length || 0} productos
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
