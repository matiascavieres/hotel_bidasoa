import { supabase } from './supabase'
import type { UserRole, LocationType } from '@/types'

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  return { error }
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  return { error }
}

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  location: LocationType | null
) {
  // First create the auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (authError) {
    return { error: authError }
  }

  // The trigger should create the profile, but we update it with correct role/location
  if (authData.user) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        role,
        location,
      })
      .eq('id', authData.user.id)

    if (updateError) {
      return { error: updateError }
    }
  }

  return { data: authData, error: null }
}

export function canAccessLocation(
  userRole: UserRole,
  userLocation: LocationType | null,
  targetLocation: LocationType
): boolean {
  // Admins can access all locations
  if (userRole === 'admin') return true

  // Bodegueros can access all locations
  if (userRole === 'bodeguero') return true

  // Bartenders can only access their assigned location
  return userLocation === targetLocation
}

export function canManageInventory(role: UserRole): boolean {
  return role === 'admin' || role === 'bodeguero'
}

export function canApproveRequests(role: UserRole): boolean {
  return role === 'admin' || role === 'bodeguero'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}

export function canManageProducts(role: UserRole): boolean {
  return role === 'admin'
}

export function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/'
    case 'bodeguero':
      return '/'
    case 'bartender':
      return '/stock'
    default:
      return '/'
  }
}
