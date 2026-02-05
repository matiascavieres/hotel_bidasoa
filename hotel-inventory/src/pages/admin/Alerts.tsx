import { useState } from 'react'
import { Plus, Edit2, Trash2, Bell, BellOff, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useProducts } from '@/hooks/useInventory'
import {
  useAlertsWithStock,
  useCreateAlertConfig,
  useUpdateAlertConfig,
  useDeleteAlertConfig,
  useToggleAlertConfig,
  type AlertWithStock,
} from '@/hooks/useAlertConfigs'
import { LOCATION_NAMES, type LocationType } from '@/types'

export default function AdminAlerts() {
  const { toast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState<AlertWithStock | null>(null)
  const [formData, setFormData] = useState({
    product_id: '',
    location: '' as LocationType | '',
    min_stock_ml: 0,
    email_recipients: '',
    is_active: true,
  })

  // Queries
  const { data: alerts, isLoading: alertsLoading } = useAlertsWithStock()
  const { data: products, isLoading: productsLoading } = useProducts()

  // Mutations
  const createAlert = useCreateAlertConfig()
  const updateAlert = useUpdateAlertConfig()
  const deleteAlert = useDeleteAlertConfig()
  const toggleAlert = useToggleAlertConfig()

  const isLoading = alertsLoading || productsLoading
  const isMutating = createAlert.isPending || updateAlert.isPending || deleteAlert.isPending || toggleAlert.isPending

  // Calculate summary stats
  const activeAlertsCount = alerts?.filter(a => a.is_active).length ?? 0
  const triggeredAlertsCount = alerts?.filter(a => a.is_triggered).length ?? 0
  const productsWithoutAlert = (products?.length ?? 0) - (alerts?.length ?? 0)

  const handleOpenModal = (alert?: AlertWithStock) => {
    if (alert) {
      setEditingAlert(alert)
      setFormData({
        product_id: alert.product_id,
        location: alert.location,
        min_stock_ml: alert.min_stock_ml,
        email_recipients: alert.email_recipients.join(', '),
        is_active: alert.is_active,
      })
    } else {
      setEditingAlert(null)
      setFormData({
        product_id: '',
        location: '',
        min_stock_ml: 0,
        email_recipients: '',
        is_active: true,
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.product_id || !formData.location) {
      toast({
        title: 'Error',
        description: 'Selecciona un producto y ubicación',
        variant: 'destructive',
      })
      return
    }

    const emailRecipients = formData.email_recipients
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0)

    if (emailRecipients.length === 0) {
      toast({
        title: 'Error',
        description: 'Agrega al menos un email para notificaciones',
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingAlert) {
        await updateAlert.mutateAsync({
          id: editingAlert.id,
          updates: {
            min_stock_ml: formData.min_stock_ml,
            email_recipients: emailRecipients,
            is_active: formData.is_active,
          },
        })
        toast({
          title: 'Alerta actualizada',
          description: 'La configuración de alerta ha sido guardada',
        })
      } else {
        await createAlert.mutateAsync({
          product_id: formData.product_id,
          location: formData.location as LocationType,
          min_stock_ml: formData.min_stock_ml,
          email_recipients: emailRecipients,
          is_active: formData.is_active,
        })
        toast({
          title: 'Alerta creada',
          description: 'La nueva alerta ha sido configurada',
        })
      }
      setIsModalOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar la alerta',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (alert: AlertWithStock) => {
    try {
      await deleteAlert.mutateAsync(alert.id)
      toast({
        title: 'Alerta eliminada',
        description: `La alerta para ${alert.product?.name} ha sido eliminada`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la alerta',
        variant: 'destructive',
      })
    }
  }

  const handleToggle = async (alert: AlertWithStock) => {
    try {
      await toggleAlert.mutateAsync({
        id: alert.id,
        is_active: !alert.is_active,
      })
      toast({
        title: alert.is_active ? 'Alerta desactivada' : 'Alerta activada',
        description: `La alerta para ${alert.product?.name} ha sido ${
          alert.is_active ? 'desactivada' : 'activada'
        }`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado de la alerta',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración de Alertas</h1>
          <p className="text-muted-foreground">
            Configura alertas de stock bajo por producto y ubicación
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={isMutating}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Alerta
        </Button>
      </div>

      {/* Active alerts summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlertsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alertas Disparadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${triggeredAlertsCount > 0 ? 'text-warning' : ''}`}>
              {triggeredAlertsCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Productos sin Alerta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {productsWithoutAlert > 0 ? productsWithoutAlert : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts list */}
      {alerts && alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No hay alertas configuradas
            </p>
            <Button className="mt-4" onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primera alerta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts?.map((alert) => (
            <Card
              key={alert.id}
              className={`${!alert.is_active ? 'opacity-60' : ''} ${
                alert.is_triggered ? 'border-warning' : ''
              }`}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{alert.product?.name}</p>
                    <Badge variant={alert.is_active ? 'default' : 'secondary'}>
                      {alert.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                    {alert.is_triggered && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Bajo Stock
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alert.product?.code} • {LOCATION_NAMES[alert.location]}
                  </p>
                  <p className="text-sm">
                    Stock mínimo: <span className="font-medium">{alert.min_stock_ml}ml</span>
                    {' | '}
                    Stock actual:{' '}
                    <span className={`font-medium ${alert.is_triggered ? 'text-destructive' : ''}`}>
                      {alert.current_stock}ml
                    </span>
                    {' | '}
                    Emails: {alert.email_recipients.length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggle(alert)}
                    disabled={isMutating}
                  >
                    {alert.is_active ? (
                      <BellOff className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenModal(alert)}
                    disabled={isMutating}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(alert)}
                    disabled={isMutating}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Alert Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAlert ? 'Editar Alerta' : 'Nueva Alerta'}
            </DialogTitle>
            <DialogDescription>
              Configura cuándo recibir notificaciones de stock bajo
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select
                value={formData.product_id}
                onValueChange={(v) => setFormData({ ...formData, product_id: v })}
                disabled={!!editingAlert}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Select
                value={formData.location}
                onValueChange={(v) => setFormData({ ...formData, location: v as LocationType })}
                disabled={!!editingAlert}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ubicación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bodega">Bodega</SelectItem>
                  <SelectItem value="bar_casa_sanz">Bar Casa Sanz</SelectItem>
                  <SelectItem value="bar_hotel_bidasoa">Bar Hotel Bidasoa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_stock_ml">Stock mínimo (ml)</Label>
              <Input
                id="min_stock_ml"
                type="number"
                value={formData.min_stock_ml}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    min_stock_ml: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_recipients">
                Emails de notificación (separados por coma)
              </Label>
              <Input
                id="email_recipients"
                value={formData.email_recipients}
                onChange={(e) =>
                  setFormData({ ...formData, email_recipients: e.target.value })
                }
                placeholder="admin@hotel.cl, bodega@hotel.cl"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Alerta activa</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAlert ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
