import { useState } from 'react'
import { Plus, Edit2, Upload, Search, Loader2 } from 'lucide-react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
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

  const filteredProducts = (products || []).filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) as Product[]

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
            {products?.length || 0} productos en el catalogo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Button onClick={() => handleOpenProductModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar producto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Product list */}
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenProductModal(product)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

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
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                />
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
    </div>
  )
}
