import {
  HelpCircle,
  Package,
  ClipboardList,
  Edit2,
  Search,
  ScanBarcode,
  CheckCircle2,
  ArrowRight,
  Users,
  Shield,
  Settings,
  MessageCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

function StepCard({ step, title, description, icon: Icon }: {
  step: number
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
        {step}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h4 className="font-semibold">{title}</h4>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export default function Help() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Ayuda</h1>
          <p className="text-sm text-muted-foreground">
            Guia de uso del sistema de inventario
          </p>
        </div>
      </div>

      {/* ====== INVENTARIO ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Como hacer el inventario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-300">
              Importante: El administrador debe activar el "Modo Inventario" en
            </p>
            <p className="text-blue-700 dark:text-blue-400 flex items-center gap-1 mt-1">
              <Settings className="h-3.5 w-3.5" />
              Configuracion <ArrowRight className="h-3 w-3" /> Modo Inventario <ArrowRight className="h-3 w-3" /> Activar
            </p>
          </div>

          <StepCard
            step={1}
            icon={Package}
            title="Ir a Stock"
            description="Desde el menu lateral o inferior, selecciona 'Stock'. Veras tu ubicacion asignada automaticamente."
          />

          <StepCard
            step={2}
            icon={Search}
            title="Buscar el producto"
            description="Usa la barra de busqueda para encontrar el producto por nombre. Tambien puedes filtrar por categoria o estado."
          />

          <StepCard
            step={3}
            icon={ScanBarcode}
            title="Escanear codigo de barras (opcional)"
            description="Al editar un producto, puedes presionar el icono de codigo de barras junto al campo 'Codigo'. Sube una foto del codigo de barras del producto para auto-completar el campo."
          />

          <StepCard
            step={4}
            icon={Edit2}
            title="Editar la cantidad"
            description="Presiona el boton de editar (lapiz) en el producto. Ingresa la cantidad actual que contaste fisicamente. Puedes ingresar en botellas o en mililitros."
          />

          <StepCard
            step={5}
            icon={CheckCircle2}
            title="Guardar"
            description="Presiona 'Guardar' para actualizar el stock. El cambio queda registrado en el historial automaticamente."
          />

          <Separator />

          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Consejos
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Trabaja por categorias para no perderte (ej: primero todas las Aguas, luego Cervezas, etc.)</li>
              <li>Si un producto tiene 0 unidades, ingresa 0 para que quede registrado como "Sin Stock"</li>
              <li>Cada cambio se guarda inmediatamente, no necesitas confirmar al final</li>
              <li>Puedes usar la vista "General" para ver el stock de todas las ubicaciones a la vez</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ====== PEDIDOS ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Como hacer un pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <StepCard
            step={1}
            icon={ClipboardList}
            title="Ir a Solicitudes"
            description="Desde el menu, selecciona 'Solicitudes' y luego presiona 'Nueva Solicitud'."
          />

          <StepCard
            step={2}
            icon={Package}
            title="Seleccionar ubicacion destino"
            description="Elige a que bar va dirigido el pedido (Bar Casa Sanz o Bar Hotel Bidasoa)."
          />

          <StepCard
            step={3}
            icon={Search}
            title="Agregar productos al carrito"
            description="Busca los productos que necesitas, indica la cantidad y agregalos al carrito."
          />

          <StepCard
            step={4}
            icon={CheckCircle2}
            title="Enviar solicitud"
            description="Revisa tu carrito y presiona 'Enviar solicitud'. El bodeguero recibira una notificacion por email y podra aprobar o rechazar tu pedido."
          />
        </CardContent>
      </Card>

      {/* ====== ROLES ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Roles y permisos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                Administrador
              </Badge>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Acceso completo a todo el sistema</li>
              <li>Crear y administrar usuarios</li>
              <li>Editar catalogo de productos</li>
              <li>Activar/desactivar modo inventario</li>
              <li>Configurar alertas de stock</li>
            </ul>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                Bodeguero
              </Badge>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Editar stock en todas las ubicaciones</li>
              <li>Aprobar o rechazar solicitudes de pedido</li>
              <li>Marcar pedidos como entregados (mueve stock automaticamente)</li>
              <li>Crear traspasos entre ubicaciones</li>
            </ul>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Bartender / Sommelier
              </Badge>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Ver stock de su ubicacion asignada</li>
              <li>Crear solicitudes de pedido a bodega</li>
              <li>Editar stock en su ubicacion <strong>solo cuando el modo inventario esta activo</strong></li>
              <li>Ver historial de sus propias acciones</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ====== FAQ ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Preguntas frecuentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <details className="group">
            <summary className="cursor-pointer font-medium text-sm py-2 hover:text-primary">
              No puedo editar el stock, que hago?
            </summary>
            <p className="text-sm text-muted-foreground pl-4 pb-2">
              Si eres bartender o sommelier, el administrador debe activar el "Modo Inventario" desde
              Configuracion. Contacta al administrador para que lo active.
            </p>
          </details>
          <Separator />

          <details className="group">
            <summary className="cursor-pointer font-medium text-sm py-2 hover:text-primary">
              El escaner de codigo de barras no funciona, que hago?
            </summary>
            <p className="text-sm text-muted-foreground pl-4 pb-2">
              El escaner funciona subiendo una foto del codigo de barras. Asegurate de que la foto sea nitida
              y que el codigo este completo en la imagen. Si no funciona, puedes ingresar el codigo manualmente.
            </p>
          </details>
          <Separator />

          <details className="group">
            <summary className="cursor-pointer font-medium text-sm py-2 hover:text-primary">
              Puedo ver el stock de otras ubicaciones?
            </summary>
            <p className="text-sm text-muted-foreground pl-4 pb-2">
              Solo los administradores y bodegueros pueden ver el stock de todas las ubicaciones.
              Los bartenders solo ven su ubicacion asignada.
            </p>
          </details>
          <Separator />

          <details className="group">
            <summary className="cursor-pointer font-medium text-sm py-2 hover:text-primary">
              Como se cuando mi pedido fue aprobado?
            </summary>
            <p className="text-sm text-muted-foreground pl-4 pb-2">
              Recibiras un email de notificacion cuando el bodeguero apruebe, rechace o entregue tu pedido.
              Tambien puedes revisar el estado en la seccion de Solicitudes.
            </p>
          </details>
          <Separator />

          <details className="group">
            <summary className="cursor-pointer font-medium text-sm py-2 hover:text-primary">
              Que pasa si ingreso una cantidad incorrecta?
            </summary>
            <p className="text-sm text-muted-foreground pl-4 pb-2">
              Puedes editar la cantidad nuevamente. Todos los cambios quedan registrados en el historial,
              asi que siempre se puede ver que se cambio y cuando.
            </p>
          </details>
          <Separator />

          <details className="group">
            <summary className="cursor-pointer font-medium text-sm py-2 hover:text-primary">
              Varias personas pueden editar al mismo tiempo?
            </summary>
            <p className="text-sm text-muted-foreground pl-4 pb-2">
              Si, el sistema permite uso concurrente. Cada persona edita el stock de su ubicacion
              asignada sin conflictos. Los cambios se guardan inmediatamente.
            </p>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}
