import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, Lock, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function ChangePassword() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const isForced = profile?.must_change_password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'La nueva contrasena debe tener al menos 6 caracteres',
        variant: 'destructive',
      })
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contrasenas no coinciden',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      // Verify current password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: formData.currentPassword,
      })

      if (signInError) {
        toast({
          title: 'Error',
          description: 'La contrasena actual es incorrecta',
          variant: 'destructive',
        })
        setIsLoading(false)
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      })

      if (updateError) throw updateError

      // Clear must_change_password flag
      if (profile?.must_change_password) {
        await supabase
          .from('users')
          .update({ must_change_password: false })
          .eq('id', profile.id)
        await refreshProfile()
      }

      toast({
        title: 'Contrasena actualizada',
        description: 'Tu contrasena ha sido cambiada exitosamente',
      })

      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      navigate('/dashboard')
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al cambiar la contrasena',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {!isForced && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">Cambiar contrasena</h1>
          <p className="text-muted-foreground">
            {isForced
              ? 'Debes cambiar tu contrasena antes de continuar'
              : 'Actualiza tu contrasena de acceso'}
          </p>
        </div>
      </div>

      {isForced && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            Es tu primer inicio de sesion. Por seguridad, debes cambiar la contrasena proporcionada por el administrador.
          </p>
        </div>
      )}

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Nueva contrasena
          </CardTitle>
          <CardDescription>
            Ingresa tu contrasena actual y la nueva contrasena
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                {isForced ? 'Contrasena proporcionada' : 'Contrasena actual'}
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData({ ...formData, currentPassword: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva contrasena</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({ ...formData, newPassword: e.target.value })
                }
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Minimo 6 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Cambiar contrasena'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
