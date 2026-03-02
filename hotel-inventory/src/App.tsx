import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { Layout } from '@/components/layout/Layout'
import LandingPage from '@/pages/LandingPage'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Stock from '@/pages/Stock'
import Requests from '@/pages/Requests'
import NewRequest from '@/pages/NewRequest'
import Transfers from '@/pages/Transfers'
import NewTransfer from '@/pages/NewTransfer'
import History from '@/pages/History'
import AdminUsers from '@/pages/admin/Users'
import AdminCatalog from '@/pages/admin/Catalog'
import AdminAlerts from '@/pages/admin/Alerts'
import SalesAnalysis from '@/pages/SalesAnalysis'
import SalesImport from '@/pages/SalesImport'
import MoreMenu from '@/pages/MoreMenu'
import Inbound from '@/pages/Inbound'
import NewInbound from '@/pages/NewInbound'
import AdminRecipes from '@/pages/admin/Recipes'
import AdminSettings from '@/pages/admin/Settings'
import Help from '@/pages/Help'
import ChangePassword from '@/pages/ChangePassword'
import ForgotPassword from '@/pages/ForgotPassword'
import type { UserRole } from '@/types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Protected route component
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  console.log('[PROTECTED]', location.pathname, '| loading:', loading, '| user:', user?.email || null, '| profile:', profile?.role || null, '| must_change_pw:', profile?.must_change_password)

  if (loading) {
    console.log('[PROTECTED] → mostrando spinner')
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    console.log('[PROTECTED] → redirigiendo a /login (no user)')
    return <Navigate to="/login" replace />
  }

  // Force password change on first login
  const decodedPath = decodeURIComponent(location.pathname)
  if (profile?.must_change_password && decodedPath !== '/cambiar-contraseña') {
    console.log('[PROTECTED] → redirigiendo a /cambiar-contraseña (must_change_password)')
    return <Navigate to="/cambiar-contraseña" replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    console.log('[PROTECTED] → redirigiendo a /dashboard (role no permitido)')
    return <Navigate to="/dashboard" replace />
  }

  console.log('[PROTECTED] → renderizando children')
  return <>{children}</>
}

// Public route that redirects if logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  console.log('[PUBLIC] loading:', loading, '| user:', user?.email || null)

  if (loading) {
    console.log('[PUBLIC] → mostrando spinner')
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user) {
    console.log('[PUBLIC] → redirigiendo a /dashboard (user autenticado)')
    return <Navigate to="/dashboard" replace />
  }

  console.log('[PUBLIC] → renderizando children (login form)')
  return <>{children}</>
}

// Landing route: shows landing for non-auth, redirects to dashboard for auth
function LandingRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <LandingPage />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing page (public) */}
      <Route path="/" element={<LandingRoute />} />

      {/* Login */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Forgot password (public) */}
      <Route
        path="/olvide-contraseña"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />

      {/* Protected routes with layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/solicitudes" element={<Requests />} />
        <Route path="/solicitudes/nueva" element={<NewRequest />} />
        <Route
          path="/traspasos"
          element={
            <ProtectedRoute allowedRoles={['admin', 'bodeguero']}>
              <Transfers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/traspasos/nuevo"
          element={
            <ProtectedRoute allowedRoles={['admin', 'bodeguero']}>
              <NewTransfer />
            </ProtectedRoute>
          }
        />
        <Route path="/historial" element={<History />} />
        <Route
          path="/ventas"
          element={
            <ProtectedRoute allowedRoles={['admin', 'bodeguero']}>
              <SalesAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbound"
          element={
            <ProtectedRoute allowedRoles={['admin', 'bodeguero']}>
              <Inbound />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbound/nuevo"
          element={
            <ProtectedRoute allowedRoles={['admin', 'bodeguero']}>
              <NewInbound />
            </ProtectedRoute>
          }
        />
        <Route path="/menu" element={<MoreMenu />} />
        <Route path="/cambiar-contraseña" element={<ChangePassword />} />

        {/* Admin routes */}
        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/catalogo"
          element={
            <ProtectedRoute allowedRoles={['admin', 'bartender']}>
              <AdminCatalog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/alertas"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAlerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/recetas"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminRecipes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/configuracion"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
        <Route path="/ayuda" element={<Help />} />
        <Route
          path="/ventas/importar"
          element={
            <ProtectedRoute allowedRoles={['admin', 'bodeguero']}>
              <SalesImport />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
