import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PackagePlus, FileText, Camera, X, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { InboundProductSelector } from '@/components/inbound/InboundProductSelector'
import { InboundCart } from '@/components/inbound/InboundCart'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useCreateInbound } from '@/hooks/useInbounds'
import type { CartItem } from '@/types'

export default function NewInbound() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const createInbound = useCreateInbound()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const cartProductIds = useMemo(
    () => new Set(cart.map((item) => item.product.id)),
    [cart]
  )

  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item])
  }

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId))
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newFiles = [...imageFiles, ...files]
    setImageFiles(newFiles)

    // Generar previews
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })

    // Limpiar el input para permitir subir el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Error',
        description: 'Agrega al menos un producto al ingreso',
        variant: 'destructive',
      })
      return
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'No se pudo identificar tu usuario',
        variant: 'destructive',
      })
      return
    }

    createInbound.mutate(
      {
        items: cart,
        invoiceNumber: invoiceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        imageFiles,
        creatorId: user.id,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Ingreso registrado',
            description: `Se registraron ${cart.length} producto(s) en bodega`,
          })
          navigate('/inbound')
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'No se pudo registrar el ingreso',
            variant: 'destructive',
          })
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Ingreso</h1>
          <p className="text-muted-foreground">
            Registra productos recibidos de proveedor en bodega
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Selector de productos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PackagePlus className="h-5 w-5" />
              Buscar Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InboundProductSelector
              onAddToCart={handleAddToCart}
              cartProductIds={cartProductIds}
            />
          </CardContent>
        </Card>

        {/* Panel derecho */}
        <div className="space-y-4">
          {/* Carrito */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Productos a ingresar ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InboundCart
                items={cart}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
              />
            </CardContent>
          </Card>

          {/* Número de factura */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Factura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="invoice-number">Número de factura</Label>
                <Input
                  id="invoice-number"
                  placeholder="Ej: 000123456"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Upload de imágenes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Imágenes de factura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img
                        src={src}
                        alt={`Imagen ${idx + 1}`}
                        className="h-full w-full rounded-md border object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/80"
                        onClick={() => handleRemoveImage(idx)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
              />

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                {imagePreviews.length > 0 ? 'Agregar más imágenes' : 'Subir imágenes de factura'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Puedes subir fotos de la factura desde tu teléfono o computador
              </p>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notas (opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observaciones sobre el ingreso..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Botón submit */}
          <Button
            onClick={handleSubmit}
            disabled={cart.length === 0 || createInbound.isPending}
            className="w-full"
            size="lg"
          >
            {createInbound.isPending
              ? 'Registrando ingreso...'
              : `Registrar Ingreso (${cart.length} producto${cart.length !== 1 ? 's' : ''})`}
          </Button>
        </div>
      </div>
    </div>
  )
}
