import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ArrowLeftRight,
  History,
  Users,
  Settings,
  BookOpen,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface SidebarProps {
  collapsed?: boolean
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('admin' | 'bodeguero' | 'bartender')[]
}

const mainNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Stock',
    href: '/stock',
    icon: Package,
  },
  {
    label: 'Solicitudes',
    href: '/solicitudes',
    icon: ClipboardList,
  },
  {
    label: 'Traspasos',
    href: '/traspasos',
    icon: ArrowLeftRight,
    roles: ['admin', 'bodeguero'],
  },
  {
    label: 'Historial',
    href: '/historial',
    icon: History,
  },
]

const adminNavItems: NavItem[] = [
  {
    label: 'Usuarios',
    href: '/admin/usuarios',
    icon: Users,
    roles: ['admin'],
  },
  {
    label: 'Catalogo',
    href: '/admin/catalogo',
    icon: BookOpen,
    roles: ['admin'],
  },
  {
    label: 'Alertas',
    href: '/admin/alertas',
    icon: Bell,
    roles: ['admin'],
  },
  {
    label: 'Configuracion',
    href: '/admin/configuracion',
    icon: Settings,
    roles: ['admin'],
  },
]

export function Sidebar({ collapsed = false }: SidebarProps) {
  const { profile } = useAuth()
  const userRole = profile?.role

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => {
      if (!item.roles) return true
      if (!userRole) return false
      return item.roles.includes(userRole)
    })

  const visibleMainItems = filterByRole(mainNavItems)
  const visibleAdminItems = filterByRole(adminNavItems)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        {collapsed ? (
          <span className="text-xl font-bold">HB</span>
        ) : (
          <span className="text-xl font-bold">Hotel Bidasoa</span>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-4rem)]">
        <nav className="flex flex-col gap-1 p-4">
          {visibleMainItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center'
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {visibleAdminItems.length > 0 && (
            <>
              <Separator className="my-4" />
              {!collapsed && (
                <span className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                  Administracion
                </span>
              )}
              {visibleAdminItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      collapsed && 'justify-center'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </ScrollArea>
    </aside>
  )
}
