// User roles
export type UserRole = 'admin' | 'bodeguero' | 'bartender'

// Location types
export type LocationType = 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'

// Request statuses
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'delivered'

// Transfer statuses
export type TransferStatus = 'pending' | 'completed'

// Log action types
export type LogAction =
  | 'stock_adjustment'
  | 'request_created'
  | 'request_approved'
  | 'request_rejected'
  | 'request_delivered'
  | 'transfer_created'
  | 'transfer_completed'
  | 'product_created'
  | 'product_updated'
  | 'user_created'
  | 'user_updated'

// Unit types for display
export type UnitType = 'ml' | 'bottles' | 'units'

// User
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  location: LocationType | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Category
export interface Category {
  id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
}

// Product
export interface Product {
  id: string
  code: string
  name: string
  category_id: string
  format_ml: number | null
  sale_price: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  category?: Category
}

// Inventory
export interface Inventory {
  id: string
  product_id: string
  location: LocationType
  quantity_ml: number
  min_stock_ml: number | null
  created_at: string
  updated_at: string
  // Joined fields
  product?: Product
}

// Request
export interface Request {
  id: string
  requester_id: string
  location: LocationType
  status: RequestStatus
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  delivered_by: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  requester?: User
  approver?: User
  deliverer?: User
  items?: RequestItem[]
}

// Request Item
export interface RequestItem {
  id: string
  request_id: string
  product_id: string
  quantity_requested: number
  unit_type: UnitType
  quantity_approved: number | null
  is_available: boolean | null
  notes: string | null
  // Joined fields
  product?: Product
}

// Transfer
export interface Transfer {
  id: string
  from_location: LocationType
  to_location: LocationType
  created_by: string
  status: TransferStatus
  notes: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  creator?: User
  confirmer?: User
  items?: TransferItem[]
}

// Transfer Item
export interface TransferItem {
  id: string
  transfer_id: string
  product_id: string
  quantity_ml: number
  // Joined fields
  product?: Product
}

// Audit Log
export interface AuditLog {
  id: string
  user_id: string
  action: LogAction
  entity_type: string
  entity_id: string
  location: LocationType | null
  details: Record<string, unknown>
  created_at: string
  // Joined fields
  user?: User
}

// Alert Configuration
export interface AlertConfig {
  id: string
  product_id: string
  location: LocationType
  min_stock_ml: number
  email_recipients: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  product?: Product
}

// Cart Item (for UI state)
export interface CartItem {
  product: Product
  quantity: number
  unit_type: UnitType
  notes?: string
}

// Stock summary for dashboard
export interface StockSummary {
  total_products: number
  low_stock_count: number
  out_of_stock_count: number
  pending_requests: number
}

// Location display names
export const LOCATION_NAMES: Record<LocationType, string> = {
  bodega: 'Bodega',
  bar_casa_sanz: 'Bar Casa Sanz',
  bar_hotel_bidasoa: 'Bar Hotel Bidasoa',
}

// Role display names
export const ROLE_NAMES: Record<UserRole, string> = {
  admin: 'Administrador',
  bodeguero: 'Bodeguero',
  bartender: 'Bartender',
}

// Status display names and colors
export const REQUEST_STATUS_CONFIG: Record<RequestStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  approved: { label: 'Aprobada', color: 'success' },
  rejected: { label: 'Rechazada', color: 'destructive' },
  delivered: { label: 'Entregada', color: 'success' },
}

export const TRANSFER_STATUS_CONFIG: Record<TransferStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  completed: { label: 'Completado', color: 'success' },
}
