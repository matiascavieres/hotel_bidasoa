import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User as AuthUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthContextType {
  session: Session | null
  user: AuthUser | null
  profile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Track whether profile has been loaded at least once — avoids spinner on token renewals
  const profileLoadedRef = useRef(false)

  const fetchProfile = async (userId: string): Promise<User | null> => {
    console.log('[AUTH] fetchProfile llamado para userId:', userId)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[AUTH] fetchProfile ERROR:', error.message, error.code, error.details)
        return null
      }

      console.log('[AUTH] fetchProfile OK, profile:', { id: data.id, role: data.role, must_change_password: data.must_change_password, full_name: data.full_name })
      return data as User
    } catch (e) {
      console.error('[AUTH] fetchProfile CATCH:', e)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const newProfile = await fetchProfile(user.id)
      setProfile(newProfile)
    }
  }

  useEffect(() => {
    let isMounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AUTH] onAuthStateChange evento:', _event, 'session?', !!session, 'user?', session?.user?.email)

      if (!isMounted) {
        console.log('[AUTH] onAuthStateChange: componente desmontado, ignorando')
        return
      }

      // TOKEN_REFRESHED solo actualiza la sesión, no recarga perfil ni muestra spinner
      if (_event === 'TOKEN_REFRESHED') {
        setSession(session)
        return
      }

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        // Only show spinner on first load — not on token renewals or tab re-focus
        if (!profileLoadedRef.current) {
          setLoading(true)
          console.log('[AUTH] loading=true (perfil no cargado aún), iniciando fetchProfile...')
        } else {
          console.log('[AUTH] token renovado, actualizando perfil en background (sin spinner)...')
        }
        // Usar setTimeout para evitar bloqueo de Supabase auth
        setTimeout(async () => {
          if (!isMounted) {
            console.log('[AUTH] setTimeout: componente desmontado, abortando')
            return
          }
          console.log('[AUTH] setTimeout ejecutado, llamando fetchProfile...')
          const userProfile = await fetchProfile(session.user.id)
          if (isMounted) {
            if (!userProfile) {
              // El perfil no existe en la tabla users (usuario eliminado de la BD)
              console.warn('[AUTH] fetchProfile retornó null → usuario sin perfil en BD, cerrando sesión...')
              profileLoadedRef.current = false
              await supabase.auth.signOut({ scope: 'local' })
              setSession(null)
              setUser(null)
              setProfile(null)
              setLoading(false)
              return
            }
            console.log('[AUTH] setProfile:', 'OK', 'setLoading(false)')
            profileLoadedRef.current = true
            setProfile(userProfile)
            setLoading(false)
          }
        }, 0)
      } else {
        console.log('[AUTH] No hay sesion, limpiando estado')
        profileLoadedRef.current = false
        setProfile(null)
        setLoading(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH] getSession inicial:', session ? 'sesion encontrada' : 'sin sesion')
      if (!session && isMounted) {
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { error: error as Error | null }
  }

  const signOut = async () => {
    setSession(null)
    setUser(null)
    setProfile(null)

    const keysToRemove = Object.keys(localStorage).filter(
      key => key.startsWith('sb-') || key.includes('supabase')
    )
    keysToRemove.forEach(key => localStorage.removeItem(key))

    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Silent fail - state already cleared
    }
  }

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
