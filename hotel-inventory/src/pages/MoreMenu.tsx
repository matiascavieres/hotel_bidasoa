import { Link } from 'react-router-dom'
import {
  History,
  TrendingUp,
  Users,
  BookOpen,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import { LOCATION_NAMES, ROLE_NAMES } from '@/types'

export default function MoreMenu() {
  const { profile, signOut } = useAuth()

  const isAdmin = profile?.role === 'admin'

  const menuItems = [
    {
      label: 'Historial',
      href: '/historial',
      icon: History,
      show: true,
    },
    {
      label: 'Analisis de Ventas',
      href: '/ventas',
      icon: TrendingUp,
      show: isAdmin || profile?.role === 'bodeguero',
    },
    {
      label: 'Usuarios',
      href: '/admin/usuarios',
      icon: Users,
      show: isAdmin,
    },
    {
      label: 'Catalogo de Productos',
      href: '/admin/catalogo',
      icon: BookOpen,
      show: isAdmin,
    },
    {
      label: 'Configuracion de Alertas',
      href: '/admin/alertas',
      icon: Bell,
      show: isAdmin,
    },
    {
      label: 'Configuracion',
      href: '/admin/configuracion',
      icon: Settings,
      show: isAdmin,
    },
  ]

  const visibleItems = menuItems.filter((item) => item.show)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Menu</h1>
      </div>

      {/* User info */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-1">
            <p className="font-medium">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {profile?.role && <span>{ROLE_NAMES[profile.role]}</span>}
              {profile?.location && (
                <>
                  <span>•</span>
                  <span>{LOCATION_NAMES[profile.location]}</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu items */}
      <Card>
        <CardContent className="p-0">
          {visibleItems.map((item, index) => (
            <div key={item.href}>
              {index > 0 && <Separator />}
              <Link
                to={item.href}
                className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent className="p-0">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 p-4 text-destructive hover:bg-accent transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Cerrar sesion</span>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
