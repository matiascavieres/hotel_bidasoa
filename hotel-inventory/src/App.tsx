import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { Layout } from '@/components/layout/Layout'
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
import MoreMenu from '@/pages/MoreMenu'
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Public route that redirects if logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
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
        <Route path="/" element={<Dashboard />} />
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
        <Route path="/menu" element={<MoreMenu />} />

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
            <ProtectedRoute allowedRoles={['admin']}>
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
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
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
