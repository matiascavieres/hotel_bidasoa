export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'bodeguero' | 'bartender'
          location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'bodeguero' | 'bartender'
          location?: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'bodeguero' | 'bartender'
          location?: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          name: string
          email: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          code: string
          name: string
          category_id: string
          supplier_id: string | null
          format_ml: number | null
          sale_price: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          category_id: string
          supplier_id?: string | null
          format_ml?: number | null
          sale_price?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          category_id?: string
          supplier_id?: string | null
          format_ml?: number | null
          sale_price?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory: {
        Row: {
          id: string
          product_id: string
          location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          quantity_ml: number
          min_stock_ml: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          quantity_ml?: number
          min_stock_ml?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          location?: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          quantity_ml?: number
          min_stock_ml?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      requests: {
        Row: {
          id: string
          requester_id: string
          location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          status: 'pending' | 'approved' | 'rejected' | 'delivered'
          notes: string | null
          rejection_notes: string | null
          image_urls: string[]
          approved_by: string | null
          approved_at: string | null
          delivered_by: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          status?: 'pending' | 'approved' | 'rejected' | 'delivered'
          notes?: string | null
          rejection_notes?: string | null
          image_urls?: string[]
          approved_by?: string | null
          approved_at?: string | null
          delivered_by?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          location?: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          status?: 'pending' | 'approved' | 'rejected' | 'delivered'
          notes?: string | null
          rejection_notes?: string | null
          image_urls?: string[]
          approved_by?: string | null
          approved_at?: string | null
          delivered_by?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_requester_id_fkey"
            columns: ["requester_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      request_items: {
        Row: {
          id: string
          request_id: string
          product_id: string
          quantity_requested: number
          unit_type: 'ml' | 'bottles' | 'units'
          quantity_approved: number | null
          is_available: boolean | null
          notes: string | null
        }
        Insert: {
          id?: string
          request_id: string
          product_id: string
          quantity_requested: number
          unit_type?: 'ml' | 'bottles' | 'units'
          quantity_approved?: number | null
          is_available?: boolean | null
          notes?: string | null
        }
        Update: {
          id?: string
          request_id?: string
          product_id?: string
          quantity_requested?: number
          unit_type?: 'ml' | 'bottles' | 'units'
          quantity_approved?: number | null
          is_available?: boolean | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      transfers: {
        Row: {
          id: string
          from_location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          to_location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          created_by: string
          status: 'pending' | 'completed'
          notes: string | null
          image_urls: string[]
          confirmed_by: string | null
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          from_location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          to_location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          created_by: string
          status?: 'pending' | 'completed'
          notes?: string | null
          image_urls?: string[]
          confirmed_by?: string | null
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          from_location?: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          to_location?: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          created_by?: string
          status?: 'pending' | 'completed'
          notes?: string | null
          image_urls?: string[]
          confirmed_by?: string | null
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      transfer_items: {
        Row: {
          id: string
          transfer_id: string
          product_id: string
          quantity_ml: number
        }
        Insert: {
          id?: string
          transfer_id: string
          product_id: string
          quantity_ml: number
        }
        Update: {
          id?: string
          transfer_id?: string
          product_id?: string
          quantity_ml?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      inbounds: {
        Row: {
          id: string
          created_by: string
          invoice_number: string | null
          notes: string | null
          image_urls: string[]
          received_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_by: string
          invoice_number?: string | null
          notes?: string | null
          image_urls?: string[]
          received_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_by?: string
          invoice_number?: string | null
          notes?: string | null
          image_urls?: string[]
          received_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbounds_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      inbound_items: {
        Row: {
          id: string
          inbound_id: string
          product_id: string
          quantity_received: number
          unit_type: 'ml' | 'bottles' | 'units'
          created_at: string
        }
        Insert: {
          id?: string
          inbound_id: string
          product_id: string
          quantity_received: number
          unit_type?: 'ml' | 'bottles' | 'units'
          created_at?: string
        }
        Update: {
          id?: string
          inbound_id?: string
          product_id?: string
          quantity_received?: number
          unit_type?: 'ml' | 'bottles' | 'units'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_items_inbound_id_fkey"
            columns: ["inbound_id"]
            referencedRelation: "inbounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      recipes: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          product_id: string
          quantity_ml: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          product_id: string
          quantity_ml: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          product_id?: string
          quantity_ml?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      sales_imports: {
        Row: {
          id: string
          imported_by: string
          filename: string
          import_date: string
          total_rows: number
          matched_recipes: number
          unmatched_recipes: number
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          imported_by: string
          filename: string
          import_date: string
          total_rows?: number
          matched_recipes?: number
          unmatched_recipes?: number
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          imported_by?: string
          filename?: string
          import_date?: string
          total_rows?: number
          matched_recipes?: number
          unmatched_recipes?: number
          details?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_imports_imported_by_fkey"
            columns: ["imported_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa' | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          location?: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa' | null
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string
          location?: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa' | null
          details?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      alert_configs: {
        Row: {
          id: string
          product_id: string
          location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          min_stock_ml: number
          email_recipients: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          location: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          min_stock_ml: number
          email_recipients?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          location?: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
          min_stock_ml?: number
          email_recipients?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_configs_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      sales_data: {
        Row: {
          id: string
          receta: string
          grupo: string
          familia: string
          cantidad_2024: number
          cantidad_2025: number
          total: number
          daily_avg: number
          importe_unitario: number
          importe_total: number
          created_at: string
        }
        Insert: {
          id?: string
          receta: string
          grupo: string
          familia?: string
          cantidad_2024?: number
          cantidad_2025?: number
          total?: number
          daily_avg?: number
          importe_unitario?: number
          importe_total?: number
          created_at?: string
        }
        Update: {
          id?: string
          receta?: string
          grupo?: string
          familia?: string
          cantidad_2024?: number
          cantidad_2025?: number
          total?: number
          daily_avg?: number
          importe_unitario?: number
          importe_total?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_location: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      user_role: 'admin' | 'bodeguero' | 'bartender'
      location_type: 'bodega' | 'bar_casa_sanz' | 'bar_hotel_bidasoa'
      request_status: 'pending' | 'approved' | 'rejected' | 'delivered'
      transfer_status: 'pending' | 'completed'
      unit_type: 'ml' | 'bottles' | 'units'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for table operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
