import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LOCATION_NAMES, type LocationType } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { useUpdateInventory } from '@/hooks/useInventory'

const editSchema = z.object({
  quantity: z.number().min(0, 'La cantidad no puede ser negativa'),
  unit: z.enum(['ml', 'bottles']),
})

type EditFormData = z.infer<typeof editSchema>

interface EditQuantityModalProps {
  product: {
    id: string
    name: string
    format_ml: number
    quantity_ml: number
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
  const updateInventory = useUpdateInventory()
  const [unit, setUnit] = useState<'ml' | 'bottles'>('bottles')

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

  const onSubmit = async (data: EditFormData) => {
    // Convert to ml if in bottles
    const quantityMl =
      unit === 'bottles' ? Math.round(data.quantity * product.format_ml) : data.quantity

    updateInventory.mutate(
      {
        productId: product.id,
        location,
        quantityMl,
      },
      {
        onSuccess: () => {
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Stock</DialogTitle>
          <DialogDescription>
            {product.name} en {LOCATION_NAMES[location]}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Actual</Label>
              <div className="col-span-3 text-sm text-muted-foreground">
                {currentBottles.toFixed(1)} botellas ({product.quantity_ml}ml)
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Nuevo
              </Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="quantity"
                  type="number"
                  step={unit === 'bottles' ? '0.1' : '1'}
                  {...register('quantity', { valueAsNumber: true })}
                  className="flex-1"
                />
                <Select
                  value={unit}
                  onValueChange={(v) => handleUnitChange(v as 'ml' | 'bottles')}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottles">Botellas</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {errors.quantity && (
              <p className="text-sm text-destructive text-right">
                {errors.quantity.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateInventory.isPending}>
              {updateInventory.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
