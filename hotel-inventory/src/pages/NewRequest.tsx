import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Warehouse } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductSelector } from '@/components/requests/ProductSelector'
import { ProductCart } from '@/components/requests/ProductCart'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useCreateRequest } from '@/hooks/useRequests'
import { LOCATION_NAMES, type CartItem, type LocationType } from '@/types'

// Ubicaciones de bares (destinos válidos para solicitudes)
const BAR_LOCATIONS: LocationType[] = ['bar_hotel_bidasoa', 'bar_casa_sanz']

export default function NewRequest() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { toast } = useToast()
  const createRequest = useCreateRequest()
  const [cart, setCart] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<LocationType | ''>('')

  // Pre-seleccionar la ubicación del usuario si es un bar
  useEffect(() => {
    if (profile?.location && BAR_LOCATIONS.includes(profile.location)) {
      setSelectedLocation(profile.location)
    }
  }, [profile?.location])

  const handleAddToCart = (item: CartItem) => {
    const existingIndex = cart.findIndex((i) => i.product.id === item.product.id)
    if (existingIndex >= 0) {
      const newCart = [...cart]
      newCart[existingIndex].quantity += item.quantity
      setCart(newCart)
    } else {
      setCart([...cart, item])
    }
  }

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.product.id !== productId))
    } else {
      setCart(
        cart.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const handleSubmit = async () => {
    if (!selectedLocation) {
      toast({
        title: 'Error',
        description: 'Selecciona el bar de destino para el pedido',
        variant: 'destructive',
      })
      return
    }

    if (cart.length === 0) {
      toast({
        title: 'Error',
        description: 'Agrega al menos un producto a la solicitud',
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

    createRequest.mutate(
      {
        items: cart,
        notes,
        location: selectedLocation,
        requesterId: user.id,
        requesterName: profile?.full_name || 'Usuario',
      },
      {
        onSuccess: () => {
          toast({
            title: 'Solicitud creada',
            description: 'Tu solicitud ha sido enviada al bodeguero',
          })
          navigate('/solicitudes')
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'No se pudo crear la solicitud',
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
          <h1 className="text-2xl font-bold">Nueva Solicitud</h1>
          <p className="text-muted-foreground">
            Pedido de productos desde Bodega
          </p>
        </div>
      </div>

      {/* Selector de Destino */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Destino del Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Bar de destino</Label>
              <Select
                value={selectedLocation}
                onValueChange={(v) => setSelectedLocation(v as LocationType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el bar" />
                </SelectTrigger>
                <SelectContent>
                  {BAR_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {LOCATION_NAMES[loc]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origen</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                Bodega
              </div>
            </div>
          </div>
          {selectedLocation && (
            <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">
              Los productos serán enviados desde <strong>Bodega</strong> hacia{' '}
              <strong>{LOCATION_NAMES[selectedLocation]}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buscar Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSelector onAddToCart={handleAddToCart} />
          </CardContent>
        </Card>

        {/* Cart */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Carrito ({cart.length} productos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductCart
                items={cart}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notas (opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="notes" className="sr-only">
                Notas
              </Label>
              <Textarea
                id="notes"
                placeholder="Agregar notas o comentarios..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={!selectedLocation || cart.length === 0 || createRequest.isPending}
            className="w-full"
            size="lg"
          >
            {createRequest.isPending ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </div>
      </div>
    </div>
  )
}
