import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScanBarcode, Camera, X, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BarcodeScanner } from '@/components/ui/barcode-scanner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LOCATION_NAMES, type LocationType } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { useUpdateInventory, useCategories, useUpdateProduct } from '@/hooks/useInventory'
import { useCreateLog } from '@/hooks/useLogs'
import { useAuth } from '@/context/AuthContext'
import { useInventoryMode } from '@/hooks/useAppSettings'
import { uploadProductImage, deleteProductImage, useProductImageUrl } from '@/hooks/useProductImage'

const editSchema = z.object({
  quantity: z.number().min(0, 'La cantidad no puede ser negativa'),
  unit: z.enum(['ml', 'bottles']),
})

type EditFormData = z.infer<typeof editSchema>

interface EditQuantityModalProps {
  product: {
    id: string
    code: string
    name: string
    category: string
    category_id?: string
    format_ml: number
    quantity_ml: number
    min_stock_ml: number
    sale_price?: number | null
    image_url?: string | null
  }
  location: LocationType
  open: boolean
  onClose: () => void
}

export function EditQuantityModal({
  product,
  location,
  open,
  onClose,
}: EditQuantityModalProps) {
  const { toast } = useToast()
  const { profile } = useAuth()
  const updateInventory = useUpdateInventory()
  const updateProduct = useUpdateProduct()
  const createLog = useCreateLog()
  const { data: categories } = useCategories()
  const { data: inventoryMode } = useInventoryMode()
  const [unit, setUnit] = useState<'ml' | 'bottles'>('bottles')
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const canEditCode = isAdmin || (profile?.role === 'bartender' && inventoryMode?.enabled)

  // Product edit state
  const [productCode, setProductCode] = useState(product.code)
  const [productName, setProductName] = useState(product.name)
  const [productCategoryId, setProductCategoryId] = useState(product.category_id || '')
  const [productFormatMl, setProductFormatMl] = useState(product.format_ml)
  const [productSalePrice, setProductSalePrice] = useState(product.sale_price || 0)
  const [notes, setNotes] = useState('')

  // Image state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removingImage, setRemovingImage] = useState(false)
  const { signedUrl: existingImageUrl } = useProductImageUrl(product.image_url)

  // The display URL: preview (local) > existing signed URL > null
  const displayImageUrl = imagePreview || (removingImage ? null : existingImageUrl)

  const currentBottles = product.quantity_ml / product.format_ml

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      quantity: unit === 'bottles' ? currentBottles : product.quantity_ml,
      unit: 'bottles',
    },
  })

  const quantity = watch('quantity')

  const handleUnitChange = (newUnit: 'ml' | 'bottles') => {
    setUnit(newUnit)
    if (newUnit === 'bottles') {
      setValue('quantity', quantity / product.format_ml)
    } else {
      setValue('quantity', quantity * product.format_ml)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    setRemovingImage(false)

    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setRemovingImage(true)
  }

  // Check if product fields changed (including image)
  const hasProductChanges = () => {
    if (imageFile !== null || removingImage) return true

    if (isAdmin) {
      return (
        productCode !== product.code ||
        productName !== product.name ||
        (product.category_id && productCategoryId !== product.category_id) ||
        productFormatMl !== product.format_ml ||
        (productSalePrice || 0) !== (product.sale_price || 0)
      )
    }
    // Bartender can change code and image
    return productCode !== product.code
  }

  const onSubmit = async (data: EditFormData) => {
    const quantityMl =
      unit === 'bottles' ? Math.round(data.quantity * product.format_ml) : data.quantity
    const previousMl = product.quantity_ml
    const isMutating = updateInventory.isPending || updateProduct.isPending

    if (isMutating) return

    // Handle image upload/removal
    let newImageUrl: string | null | undefined = undefined // undefined = no change

    if (imageFile) {
      try {
        const path = await uploadProductImage(product.id, imageFile)
        newImageUrl = path

        // Delete old image if it existed
        if (product.image_url) {
          await deleteProductImage(product.image_url)
        }
      } catch (err) {
        console.error('Error uploading product image:', err)
        toast({
          title: 'Error',
          description: 'No se pudo subir la imagen del producto',
          variant: 'destructive',
        })
        return
      }
    } else if (removingImage && product.image_url) {
      newImageUrl = null
      await deleteProductImage(product.image_url)
    }

    // Save product changes if user made edits
    if (canEditCode && hasProductChanges()) {
      const changes: Record<string, { from: unknown; to: unknown }> = {}
      if (product.code !== productCode) changes.code = { from: product.code, to: productCode }
      if (newImageUrl !== undefined) changes.image = { from: product.image_url || null, to: newImageUrl }

      if (isAdmin) {
        if (product.name !== productName) changes.name = { from: product.name, to: productName }
        if (product.category_id && productCategoryId !== product.category_id) {
          const oldCat = product.category
          const newCat = categories?.find(c => c.id === productCategoryId)?.name || productCategoryId
          changes.category = { from: oldCat, to: newCat }
        }
        if (product.format_ml !== productFormatMl) changes.format_ml = { from: product.format_ml, to: productFormatMl }
        if ((product.sale_price || 0) !== (productSalePrice || 0)) changes.sale_price = { from: product.sale_price, to: productSalePrice }
      }

      const updateData = isAdmin
        ? {
            id: product.id,
            code: productCode,
            name: productName,
            categoryId: productCategoryId,
            formatMl: productFormatMl,
            salePrice: productSalePrice || undefined,
            imageUrl: newImageUrl,
          }
        : {
            id: product.id,
            code: productCode,
            name: product.name,
            categoryId: product.category_id || '',
            formatMl: product.format_ml,
            salePrice: product.sale_price || undefined,
            imageUrl: newImageUrl,
          }

      updateProduct.mutate(
        updateData,
        {
          onSuccess: () => {
            if (profile?.id) {
              createLog.mutate({
                userId: profile.id,
                action: 'product_updated',
                entityType: 'product',
                entityId: product.id,
                details: ({
                  product_name: isAdmin ? productName : product.name,
                  product_code: productCode,
                  changes,
                }) as unknown as import('@/types/database').Json,
              })
            }
          },
        }
      )
    }

    // Save stock changes
    updateInventory.mutate(
      {
        productId: product.id,
        location,
        quantityMl,
      },
      {
        onSuccess: () => {
          if (profile?.id) {
            createLog.mutate({
              userId: profile.id,
              action: 'stock_adjustment',
              entityType: 'inventory',
              entityId: product.id,
              location,
              details: {
                product_name: product.name,
                product_code: product.code,
                previous_ml: previousMl,
                new_ml: quantityMl,
                previous_bottles: parseFloat((previousMl / product.format_ml).toFixed(1)),
                new_bottles: parseFloat((quantityMl / product.format_ml).toFixed(1)),
                format_ml: product.format_ml,
                ...(notes.trim() ? { notes: notes.trim() } : {}),
              },
            })
          }

          toast({
            title: 'Stock actualizado',
            description: `${product.name} actualizado a ${quantityMl}ml (${(quantityMl / product.format_ml).toFixed(1)} botellas)`,
          })
          onClose()
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'No se pudo actualizar el stock',
            variant: 'destructive',
          })
        },
      }
    )
  }

  const isSaving = updateInventory.isPending || updateProduct.isPending

  // Hidden file input for image upload
  const imageInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={handleImageChange}
    />
  )

  // Reusable image section for editable views
  const imageSection = canEditCode && (
    <div className="flex items-center gap-3">
      {/* Image display / placeholder */}
      <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden bg-muted/30 flex items-center justify-center">
        {displayImageUrl ? (
          <>
            <img
              src={displayImageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/80 z-10"
              onClick={handleRemoveImage}
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        )}
      </div>

      {/* Upload button */}
      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="mr-1.5 h-3.5 w-3.5" />
          {displayImageUrl ? 'Cambiar foto' : 'Subir foto'}
        </Button>
        <p className="text-[10px] text-muted-foreground">
          JPG, PNG o WebP
        </p>
      </div>
    </div>
  )

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[50vh] sm:max-h-[85vh] overflow-y-auto top-[5%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle>Editar Stock</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          {imageInput}
          <div className="grid gap-4 py-4 pb-8">

            {/* Admin: all editable product fields */}
            {isAdmin ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Datos del producto</p>
                  <Badge variant="secondary" className="text-xs">
                    {LOCATION_NAMES[location]}
                  </Badge>
                </div>
                {imageSection}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Codigo</Label>
                    <div className="flex gap-1">
                      <Input
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 h-9 w-9"
                        onClick={() => setIsScannerOpen(true)}
                        title="Escanear codigo de barras"
                      >
                        <ScanBarcode className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Categoria</Label>
                    <Select
                      value={productCategoryId}
                      onValueChange={setProductCategoryId}
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
                <div className="space-y-1">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Formato (ml)</Label>
                    <Input
                      type="number"
                      value={productFormatMl}
                      onChange={(e) => setProductFormatMl(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio venta ($)</Label>
                    <Input
                      type="number"
                      value={productSalePrice}
                      onChange={(e) => setProductSalePrice(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ) : canEditCode ? (
              /* Bartender in inventory mode: read-only info + editable code + image */
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-base">{product.name}</p>
                    <p className="text-sm text-muted-foreground">ID{product.code} • {product.format_ml}ml</p>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline">{product.category}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      {LOCATION_NAMES[location]}
                    </Badge>
                  </div>
                </div>
                {imageSection}
                <div className="space-y-1">
                  <Label className="text-xs">Codigo de barras</Label>
                  <div className="flex gap-1">
                    <Input
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      className="flex-1"
                      placeholder="Escanear o escribir codigo"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      onClick={() => setIsScannerOpen(true)}
                      title="Escanear codigo de barras"
                    >
                      <ScanBarcode className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Read-only product info */
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  {/* Show read-only thumbnail if exists */}
                  {existingImageUrl && (
                    <img
                      src={existingImageUrl}
                      alt={product.name}
                      className="h-14 w-14 rounded-lg object-cover border shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-base">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.code} • {product.format_ml}ml</p>
                  </div>
                  <Badge variant="outline">{product.category}</Badge>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {LOCATION_NAMES[location]}
                </Badge>
              </div>
            )}

            {/* Current stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Stock actual</Label>
                <p className="text-lg font-bold">
                  {currentBottles.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">bot.</span>
                </p>
                <p className="text-xs text-muted-foreground">{product.quantity_ml} ml</p>
              </div>
              {product.min_stock_ml > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Stock minimo</Label>
                  <p className="text-lg font-bold">
                    {(product.min_stock_ml / product.format_ml).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">bot.</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{product.min_stock_ml} ml</p>
                </div>
              )}
            </div>

            {/* New quantity input */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Nueva cantidad</Label>
              <div className="flex gap-2">
                <Input
                  id="quantity"
                  type="number"
                  step={unit === 'bottles' ? '0.1' : '1'}
                  {...register('quantity', { valueAsNumber: true })}
                  className="flex-1 text-lg"
                  autoFocus
                />
                <Select
                  value={unit}
                  onValueChange={(v) => handleUnitChange(v as 'ml' | 'bottles')}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottles">Botellas</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.quantity && (
                <p className="text-sm text-destructive">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            {/* Notes / Comments */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs text-muted-foreground">
                Comentario (opcional)
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Botella rota, ajuste por conteo fisico..."
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Barcode Scanner */}
    {canEditCode && (
      <BarcodeScanner
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => setProductCode(code)}
      />
    )}
    </>
  )
}
