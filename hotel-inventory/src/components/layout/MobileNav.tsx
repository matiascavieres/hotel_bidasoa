import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ArrowLeftRight,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('admin' | 'bodeguero' | 'bartender')[]
}

const mobileNavItems: NavItem[] = [
  {
    label: 'Inicio',
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
    label: 'Mas',
    href: '/menu',
    icon: Menu,
  },
]

export function MobileNav() {
  const { profile } = useAuth()
  const userRole = profile?.role

  const visibleItems = mobileNavItems.filter((item) => {
    if (!item.roles) return true
    if (!userRole) return false
    return item.roles.includes(userRole)
  })

  // Limit to 5 items for mobile nav
  const displayItems = visibleItems.slice(0, 5)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around">
        {displayItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
