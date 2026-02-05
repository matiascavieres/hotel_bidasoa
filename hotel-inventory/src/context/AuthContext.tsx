import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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

  const fetchProfile = async (userId: string): Promise<User | null> => {
    console.log('[Auth] fetchProfile called with userId:', userId)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('[Auth] fetchProfile response:', { data, error })

      if (error) {
        console.error('[Auth] Error fetching profile:', error.message)
        return null
      }

      return data as User
    } catch (err) {
      console.error('[Auth] Exception in fetchProfile:', err)
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
    console.log('[Auth] Setting up auth listener...')
    let isMounted = true

    // Solo escuchamos cambios de auth - no hacemos getSession manualmente
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange:', event, !!session)

      if (!isMounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        // Usar setTimeout para evitar bloqueo de Supabase auth
        setTimeout(async () => {
          if (!isMounted) return
          const userProfile = await fetchProfile(session.user.id)
          if (isMounted) {
            setProfile(userProfile)
            setLoading(false)
          }
        }, 0)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial session check:', !!session)
      if (!session && isMounted) {
        // No hay sesión, dejar de cargar
        setLoading(false)
      }
      // Si hay sesión, onAuthStateChange ya se encargará
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('[Auth] signIn attempt for:', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[Auth] signIn error:', error.message, error.status, error)
    } else {
      console.log('[Auth] signIn success:', data.user?.id)
    }

    return { error: error as Error | null }
  }

  const signOut = async () => {
    console.log('[Auth] Starting signOut...')

    setSession(null)
    setUser(null)
    setProfile(null)

    const keysToRemove = Object.keys(localStorage).filter(
      key => key.startsWith('sb-') || key.includes('supabase')
    )
    keysToRemove.forEach(key => localStorage.removeItem(key))

    try {
      await supabase.auth.signOut({ scope: 'local' })
      console.log('[Auth] signOut completed')
    } catch (err) {
      console.warn('[Auth] signOut failed:', err)
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
