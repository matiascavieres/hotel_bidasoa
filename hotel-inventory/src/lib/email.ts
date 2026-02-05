import { supabase } from './supabase'
import type { LocationType } from '@/types'
import { LOCATION_NAMES } from '@/types'

export type EmailType =
  | 'request_created'
  | 'request_approved'
  | 'request_rejected'
  | 'request_delivered'
  | 'transfer_created'
  | 'transfer_completed'
  | 'low_stock_alert'

interface EmailData {
  [key: string]: unknown
}

// Regex para validar formato de email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Email de pruebas para recibir todos los comprobantes
const TEST_EMAIL = 'matcavieres@gmail.com'

/**
 * Valida si un string tiene formato de email válido.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

/**
 * Ejecuta una función async con reintentos y backoff exponencial.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`[Email] Attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message)

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Send a notification email via the Supabase Edge Function.
 * Fails silently - errors are logged but don't block the main operation.
 */
export async function sendNotificationEmail(
  type: EmailType,
  recipients: string[],
  data: EmailData
): Promise<{ success: boolean; error?: string }> {
  // Skip if no recipients
  if (!recipients || recipients.length === 0) {
    console.warn('[Email] No recipients provided, skipping email')
    return { success: false, error: 'No recipients' }
  }

  // Filter and validate email format
  let validRecipients = recipients.filter(email => email && isValidEmail(email))

  // Always include test email for development/testing
  if (TEST_EMAIL && !validRecipients.includes(TEST_EMAIL)) {
    validRecipients.push(TEST_EMAIL)
  }

  if (validRecipients.length === 0) {
    console.warn('[Email] No valid recipients after filtering, skipping email')
    return { success: false, error: 'No valid recipients' }
  }

  // Log filtered recipients for debugging
  const invalidCount = recipients.length - (validRecipients.length - (TEST_EMAIL ? 1 : 0))
  if (invalidCount > 0) {
    console.warn(`[Email] Filtered out ${invalidCount} invalid email(s)`)
  }

  console.log('[Email] Sending to:', validRecipients)

  try {
    // Use retry logic for resilience
    const result = await withRetry(async () => {
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: {
          type,
          recipients: validRecipients,
          data,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      return result
    })

    console.log('[Email] Email sent successfully:', result)
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed after retries:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Helper functions for specific email types

interface ProductItemEmail {
  name: string
  code?: string
  quantity: number
  unit: string
  is_available?: boolean
}

export async function sendRequestCreatedEmail(params: {
  requesterName: string
  location: LocationType
  itemsCount: number
  notes?: string
  recipients: string[]
  items?: ProductItemEmail[]
}) {
  return sendNotificationEmail('request_created', params.recipients, {
    requester_name: params.requesterName,
    location: LOCATION_NAMES[params.location],
    items_count: params.itemsCount,
    notes: params.notes,
    items: params.items || [],
  })
}

export async function sendRequestApprovedEmail(params: {
  approverName: string
  location: LocationType
  itemsApproved: number
  itemsTotal: number
  recipients: string[]
  items?: ProductItemEmail[]
}) {
  return sendNotificationEmail('request_approved', params.recipients, {
    approver_name: params.approverName,
    location: LOCATION_NAMES[params.location],
    items_approved: params.itemsApproved,
    items_total: params.itemsTotal,
    items: params.items || [],
  })
}

export async function sendRequestRejectedEmail(params: {
  approverName: string
  location: LocationType
  recipients: string[]
}) {
  return sendNotificationEmail('request_rejected', params.recipients, {
    approver_name: params.approverName,
    location: LOCATION_NAMES[params.location],
  })
}

export async function sendRequestDeliveredEmail(params: {
  delivererName: string
  location: LocationType
  itemsCount: number
  recipients: string[]
  items?: ProductItemEmail[]
}) {
  return sendNotificationEmail('request_delivered', params.recipients, {
    deliverer_name: params.delivererName,
    location: LOCATION_NAMES[params.location],
    items_count: params.itemsCount,
    items: params.items || [],
  })
}

export async function sendTransferCreatedEmail(params: {
  fromLocation: LocationType
  toLocation: LocationType
  itemsCount: number
  creatorName: string
  recipients: string[]
  items?: ProductItemEmail[]
}) {
  return sendNotificationEmail('transfer_created', params.recipients, {
    from_location: LOCATION_NAMES[params.fromLocation],
    to_location: LOCATION_NAMES[params.toLocation],
    items_count: params.itemsCount,
    creator_name: params.creatorName,
    items: params.items || [],
  })
}

export async function sendTransferCompletedEmail(params: {
  fromLocation: LocationType
  toLocation: LocationType
  itemsCount: number
  confirmerName: string
  recipients: string[]
  items?: ProductItemEmail[]
}) {
  return sendNotificationEmail('transfer_completed', params.recipients, {
    from_location: LOCATION_NAMES[params.fromLocation],
    to_location: LOCATION_NAMES[params.toLocation],
    items_count: params.itemsCount,
    confirmer_name: params.confirmerName,
    items: params.items || [],
  })
}

export async function sendLowStockAlertEmail(params: {
  productName: string
  productCode: string
  location: LocationType
  currentStock: number
  minStock: number
  recipients: string[]
}) {
  return sendNotificationEmail('low_stock_alert', params.recipients, {
    product_name: params.productName,
    product_code: params.productCode,
    location: LOCATION_NAMES[params.location],
    current_stock: params.currentStock,
    min_stock: params.minStock,
    deficit: params.minStock - params.currentStock,
  })
}

/**
 * Get bodeguero emails for a specific location.
 * This can be used to notify bodegueros when a new request is created.
 */
export async function getBodegueroEmails(location?: LocationType): Promise<string[]> {
  let query = supabase
    .from('users')
    .select('email')
    .in('role', ['admin', 'bodeguero'])
    .eq('is_active', true)

  if (location) {
    query = query.or(`location.eq.${location},role.eq.admin`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Email] Error fetching bodeguero emails:', error)
    return []
  }

  return data.map(user => user.email)
}

/**
 * Get admin emails for system-wide notifications.
 */
export async function getAdminEmails(): Promise<string[]> {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('role', 'admin')
    .eq('is_active', true)

  if (error) {
    console.error('[Email] Error fetching admin emails:', error)
    return []
  }

  return data.map(user => user.email)
}
