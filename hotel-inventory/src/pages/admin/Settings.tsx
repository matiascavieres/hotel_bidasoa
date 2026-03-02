import { Settings as SettingsIcon, ClipboardCheck, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useInventoryMode, useToggleInventoryMode } from '@/hooks/useAppSettings'

export default function AdminSettings() {
  const { toast } = useToast()
  const { data: inventoryMode, isLoading } = useInventoryMode()
  const toggleInventoryMode = useToggleInventoryMode()

  const handleToggle = async (checked: boolean) => {
    try {
      await toggleInventoryMode.mutateAsync(checked)
      toast({
        title: checked ? 'Modo inventario activado' : 'Modo inventario desactivado',
        description: checked
          ? 'Los bartenders ahora pueden editar stock en su ubicacion asignada.'
          : 'Solo administradores y bodegueros pueden editar stock.',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar la configuracion.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Configuracion</h1>
          <p className="text-sm text-muted-foreground">
            Administra la configuracion general del sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Modo Inventario</CardTitle>
                <CardDescription>
                  Habilita que los bartenders puedan editar el stock en su ubicacion asignada.
                  Activar durante el periodo de inventario (1-2 de cada mes).
                </CardDescription>
              </div>
            </div>
            {inventoryMode?.enabled ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Activo
              </Badge>
            ) : (
              <Badge variant="secondary">Inactivo</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="inventory-mode" className="font-medium">
                Permitir edicion de stock por bartenders
              </Label>
              <p className="text-sm text-muted-foreground">
                {inventoryMode?.enabled
                  ? 'Los bartenders pueden editar stock en su ubicacion asignada.'
                  : 'Solo administradores y bodegueros pueden editar stock.'}
              </p>
            </div>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                id="inventory-mode"
                checked={inventoryMode?.enabled ?? false}
                onCheckedChange={handleToggle}
                disabled={toggleInventoryMode.isPending}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
