import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
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
import { useCreateTransfer } from '@/hooks/useTransfers'
import { LOCATION_NAMES, type LocationType, type CartItem } from '@/types'

const locations: LocationType[] = ['bodega', 'bar_casa_sanz', 'bar_hotel_bidasoa']

export default function NewTransfer() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { toast } = useToast()
  const createTransfer = useCreateTransfer()
  const [fromLocation, setFromLocation] = useState<LocationType>('bodega')
  const [toLocation, setToLocation] = useState<LocationType | ''>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')

  const availableDestinations = locations.filter((loc) => loc !== fromLocation)

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
    if (!toLocation) {
      toast({
        title: 'Error',
        description: 'Selecciona una ubicación de destino',
        variant: 'destructive',
      })
      return
    }

    if (cart.length === 0) {
      toast({
        title: 'Error',
        description: 'Agrega al menos un producto al traspaso',
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

    createTransfer.mutate(
      {
        fromLocation,
        toLocation,
        items: cart,
        notes,
        creatorId: user.id,
        creatorName: profile?.full_name || 'Usuario',
      },
      {
        onSuccess: () => {
          toast({
            title: 'Traspaso creado',
            description: `Traspaso de ${LOCATION_NAMES[fromLocation]} a ${LOCATION_NAMES[toLocation]} creado`,
          })
          navigate('/traspasos')
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'No se pudo crear el traspaso',
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
          <h1 className="text-2xl font-bold">Nuevo Traspaso</h1>
          <p className="text-muted-foreground">
            Transferir productos entre ubicaciones
          </p>
        </div>
      </div>

      {/* Location selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ubicaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-2">
              <Label>Origen</Label>
              <Select
                value={fromLocation}
                onValueChange={(v) => {
                  setFromLocation(v as LocationType)
                  if (toLocation === v) setToLocation('')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {LOCATION_NAMES[loc]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="hidden h-5 w-5 text-muted-foreground sm:block" />

            <div className="flex-1 space-y-2">
              <Label>Destino</Label>
              <Select
                value={toLocation}
                onValueChange={(v) => setToLocation(v as LocationType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar destino" />
                </SelectTrigger>
                <SelectContent>
                  {availableDestinations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {LOCATION_NAMES[loc]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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

        {/* Cart and Notes */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Productos ({cart.length})
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
              <Textarea
                placeholder="Agregar notas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={!toLocation || cart.length === 0 || createTransfer.isPending}
            className="w-full"
            size="lg"
          >
            {createTransfer.isPending ? 'Creando...' : 'Crear Traspaso'}
          </Button>
        </div>
      </div>
    </div>
  )
}
