import { useState } from 'react'
import { Plus, Edit2, UserX, UserCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import { useUsers, useCreateUser, useUpdateUser, useToggleUserActive } from '@/hooks/useUsers'
import { ROLE_NAMES, LOCATION_NAMES, type UserRole, type LocationType, type User } from '@/types'

export default function AdminUsers() {
  const { toast } = useToast()
  const { data: users, isLoading, error } = useUsers()
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const toggleActiveMutation = useToggleUserActive()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'bartender' as UserRole,
    location: '' as LocationType | '',
  })

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '',
        role: user.role,
        location: user.location || '',
      })
    } else {
      setEditingUser(null)
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'bartender',
        location: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        // Update existing user
        await updateUserMutation.mutateAsync({
          userId: editingUser.id,
          updates: {
            full_name: formData.full_name,
            role: formData.role,
            location: formData.location || null,
          },
        })
        toast({
          title: 'Usuario actualizado',
          description: `${formData.full_name} ha sido actualizado`,
        })
      } else {
        // Create new user
        if (!formData.password) {
          toast({
            title: 'Error',
            description: 'La contrasena es requerida',
            variant: 'destructive',
          })
          return
        }
        await createUserMutation.mutateAsync({
          email: formData.email,
          password: formData.password,
          fullName: formData.full_name,
          role: formData.role,
          location: formData.location || null,
        })
        toast({
          title: 'Usuario creado',
          description: `${formData.full_name} ha sido creado. El usuario debe confirmar su email para poder iniciar sesion.`,
        })
      }
      setIsModalOpen(false)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al guardar usuario',
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      await toggleActiveMutation.mutateAsync({
        userId: user.id,
        isActive: user.is_active,
      })
      toast({
        title: user.is_active ? 'Usuario desactivado' : 'Usuario activado',
        description: `${user.full_name} ha sido ${user.is_active ? 'desactivado' : 'activado'}`,
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al cambiar estado del usuario',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error al cargar usuarios</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : 'Error desconocido'}
        </p>
      </div>
    )
  }

  const isSubmitting = createUserMutation.isPending || updateUserMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="space-y-3">
        {users && users.length > 0 ? (
          users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.full_name}</p>
                    {!user.is_active && (
                      <Badge variant="destructive">Inactivo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ROLE_NAMES[user.role]}</Badge>
                    {user.location && (
                      <Badge variant="secondary">
                        {LOCATION_NAMES[user.location]}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenModal(user)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(user)}
                    disabled={toggleActiveMutation.isPending}
                  >
                    {user.is_active ? (
                      <UserX className="h-4 w-4 text-destructive" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-success" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay usuarios registrados
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Modifica los datos del usuario'
                : 'Completa los datos para crear un nuevo usuario'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled={!!editingUser}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              {editingUser && (
                <p className="text-xs text-muted-foreground">
                  El email no se puede modificar
                </p>
              )}
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Minimo 6 caracteres
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(v) =>
                  setFormData({ ...formData, role: v as UserRole })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="bodeguero">Bodeguero</SelectItem>
                  <SelectItem value="bartender">Bartender</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role !== 'admin' && (
              <div className="space-y-2">
                <Label>Ubicacion</Label>
                <Select
                  value={formData.location}
                  onValueChange={(v) =>
                    setFormData({ ...formData, location: v as LocationType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ubicacion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bodega">Bodega</SelectItem>
                    <SelectItem value="bar_casa_sanz">Bar Casa Sanz</SelectItem>
                    <SelectItem value="bar_hotel_bidasoa">
                      Bar Hotel Bidasoa
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingUser ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
