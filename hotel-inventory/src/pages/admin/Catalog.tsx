import { useState, useMemo } from 'react'
import { Plus, Edit2, Upload, Search, Loader2, LayoutList, LayoutGrid, ScanBarcode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useProducts, useCategories, useCreateProduct, useUpdateProduct } from '@/hooks/useInventory'
import { useCreateLog } from '@/hooks/useLogs'
import { useAuth } from '@/context/AuthContext'
import { BarcodeScanner } from '@/components/ui/barcode-scanner'

interface Product {
  id: string
  code: string
  name: string
  category_id: string
  category: { id: string; name: string } | null
  format_ml: number | null
  sale_price: number | null
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
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    categoryId: '',
    format_ml: 0,
    sale_price: 0,
  })

  const { data: products, isLoading: productsLoading, error: productsError } = useProducts()
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const isMutating = createProduct.isPending || updateProduct.isPending

  // Get unique category names from products for filter chips
  const allCategoryNames = useMemo(() => {
    if (!products) return []
    return [...new Set(
      (products as Product[]).map(p => p.category?.name || 'Sin categoria')
    )].sort()
  }, [products])

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
    )
  }

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
    if (product) {
      setEditingProduct(product)
      setFormData({
        code: product.code,
        name: product.name,
        categoryId: product.category_id,
        format_ml: product.format_ml || 0,
        sale_price: product.sale_price || 0,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        code: '',
        name: '',
        categoryId: '',
        format_ml: 0,
        sale_price: 0,
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

  const handleImport = () => {
    toast({
      title: 'Importacion completada',
      description: 'Los productos han sido importados exitosamente',
    })
    setIsImportModalOpen(false)
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
            {filteredProducts.length} de {products?.length || 0} productos en el catalogo
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

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-muted-foreground font-medium mr-1">Categoria:</span>
        <Badge
          variant={selectedCategories.length === 0 ? 'default' : 'outline'}
          className="cursor-pointer select-none text-xs"
          onClick={() => setSelectedCategories([])}
        >
          Todas
        </Badge>
        {allCategoryNames.map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategories.includes(cat) ? 'default' : 'outline'}
            className="cursor-pointer select-none text-xs"
            onClick={() => toggleCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
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

      {/* Product Form Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent>
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

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Codigo</Label>
                <div className="flex gap-1">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setIsScannerOpen(true)}
                    title="Escanear codigo de barras"
                  >
                    <ScanBarcode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, categoryId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
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

            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="format_ml">Formato (ml)</Label>
                <Input
                  id="format_ml"
                  type="number"
                  value={formData.format_ml}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      format_ml: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_price">Precio venta ($)</Label>
                <Input
                  id="sale_price"
                  type="number"
                  value={formData.sale_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sale_price: parseInt(e.target.value) || 0,
                    })
                  }
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
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Productos</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV o XLSX con los productos a importar
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Arrastra un archivo o haz clic para seleccionar
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx"
                className="mt-4"
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Formato esperado: Nombre, Tipo, Formato en ml, ID, valor venta
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport}>
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => setFormData(prev => ({ ...prev, code }))}
      />
    </div>
  )
}
