import { Link } from 'react-router-dom'
import { Plus, Package, ArrowLeftRight, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

export function QuickActions() {
  const { profile } = useAuth()
  const role = profile?.role

  const actions = [
    {
      label: 'Nueva Solicitud',
      href: '/solicitudes/nueva',
      icon: Plus,
      variant: 'default' as const,
      show: true,
    },
    {
      label: 'Ver Stock',
      href: '/stock',
      icon: Package,
      variant: 'outline' as const,
      show: true,
    },
    {
      label: 'Nuevo Traspaso',
      href: '/traspasos/nuevo',
      icon: ArrowLeftRight,
      variant: 'outline' as const,
      show: role === 'admin' || role === 'bodeguero',
    },
    {
      label: 'Solicitudes',
      href: '/solicitudes',
      icon: ClipboardList,
      variant: 'outline' as const,
      show: role === 'admin' || role === 'bodeguero',
    },
  ]

  const visibleActions = actions.filter((action) => action.show)

  return (
    <div className="flex flex-wrap gap-2">
      {visibleActions.map((action) => (
        <Link key={action.href} to={action.href}>
          <Button variant={action.variant}>
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        </Link>
      ))}
    </div>
  )
}
