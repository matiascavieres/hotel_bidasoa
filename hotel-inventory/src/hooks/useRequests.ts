import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  sendRequestCreatedEmail,
  sendRequestApprovedEmail,
  sendRequestRejectedEmail,
  sendRequestDeliveredEmail,
  getBodegueroEmails,
} from '@/lib/email'
import type { RequestStatus, LocationType, CartItem, LogAction } from '@/types'

// Helper function to create audit logs
async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  location,
  details,
}: {
  userId: string
  action: LogAction
  entityType: string
  entityId: string
  location?: LocationType
  details?: Record<string, unknown>
}) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      location,
      details: (details || {}) as unknown as import('@/types/database').Json,
    })

  if (error) {
    console.error('[createAuditLog] Error creating log:', error)
  }
}

export function useRequests(statusFilter?: RequestStatus | 'all', locationFilter?: LocationType) {
  return useQuery({
    queryKey: ['requests', statusFilter, locationFilter],
    queryFn: async () => {
      let query = supabase
        .from('requests')
        .select(`
          *,
          requester:users!requester_id(*),
          approver:users!approved_by(*),
          deliverer:users!delivered_by(*),
          items:request_items(
            *,
            product:products(*)
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (locationFilter) {
        query = query.eq('location', locationFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
  })
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          requester:users!requester_id(*),
          approver:users!approved_by(*),
          deliverer:users!delivered_by(*),
          items:request_items(
            *,
            product:products(*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      items,
      notes,
      location,
      requesterId,
      requesterName,
    }: {
      items: CartItem[]
      notes?: string
      location: LocationType
      requesterId: string
      requesterName: string
    }) => {
      // Create the request
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .insert({
          requester_id: requesterId,
          location,
          notes,
          status: 'pending',
        })
        .select()
        .single()

      if (requestError) throw requestError

      // Create request items
      const requestItems = items.map((item) => ({
        request_id: request.id,
        product_id: item.product.id,
        quantity_requested: item.quantity,
        unit_type: item.unit_type,
      }))

      const { error: itemsError } = await supabase
        .from('request_items')
        .insert(requestItems)

      if (itemsError) throw itemsError

      // Send email notification to bodegueros (async, don't block)
      getBodegueroEmails(location).then(emails => {
        if (emails.length > 0) {
          sendRequestCreatedEmail({
            requesterName,
            location,
            itemsCount: items.length,
            notes,
            recipients: emails,
            items: items.map(item => ({
              name: item.product.name,
              code: item.product.code,
              quantity: item.quantity,
              unit: item.unit_type === 'bottles' ? 'botellas' : 'ml',
            })),
          })
        }
      })

      // Create audit log for request creation
      await createAuditLog({
        userId: requesterId,
        action: 'request_created',
        entityType: 'request',
        entityId: request.id,
        location,
        details: {
          requester_name: requesterName,
          items_count: items.length,
          notes,
          items: items.map(item => ({
            name: item.product.name,
            code: item.product.code,
            quantity: item.quantity,
            unit: item.unit_type === 'bottles' ? 'botellas' : 'ml',
          })),
        },
      })

      return request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}

export function useApproveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      approverId,
      approverName,
      itemAvailability,
    }: {
      requestId: string
      approverId: string
      approverName: string
      itemAvailability: Record<string, boolean>
    }) => {
      // Get request details for email including items
      const { data: request } = await supabase
        .from('requests')
        .select(`
          location,
          requester:users!requester_id(email, full_name),
          items:request_items(
            id,
            quantity_requested,
            unit_type,
            product:products(name, code)
          )
        `)
        .eq('id', requestId)
        .single()

      // Update request status
      const { error: requestError } = await supabase
        .from('requests')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (requestError) throw requestError

      // Update item availability
      for (const [itemId, isAvailable] of Object.entries(itemAvailability)) {
        await supabase
          .from('request_items')
          .update({ is_available: isAvailable })
          .eq('id', itemId)
      }

      // Send email notification to requester (async, don't block)
      if (request?.requester) {
        const requesterEmail = (request.requester as { email: string }).email
        const itemsApproved = Object.values(itemAvailability).filter(Boolean).length
        const itemsTotal = Object.keys(itemAvailability).length

        // Map items with availability status
        const requestItems = request.items as Array<{
          id: string
          quantity_requested: number
          unit_type: string
          product: { name: string; code: string } | null
        }>

        const emailItems = requestItems.map(item => ({
          name: item.product?.name || 'Producto',
          code: item.product?.code,
          quantity: item.quantity_requested,
          unit: item.unit_type === 'bottles' ? 'botellas' : 'ml',
          is_available: itemAvailability[item.id] ?? true,
        }))

        sendRequestApprovedEmail({
          approverName,
          location: request.location,
          itemsApproved,
          itemsTotal,
          recipients: [requesterEmail],
          items: emailItems,
        })
      }

      // Create audit log
      const requestItems = request?.items as Array<{
        id: string
        quantity_requested: number
        unit_type: string
        product: { name: string; code: string } | null
      }> || []

      await createAuditLog({
        userId: approverId,
        action: 'request_approved',
        entityType: 'request',
        entityId: requestId,
        location: request?.location,
        details: {
          approver_name: approverName,
          items_count: Object.keys(itemAvailability).length,
          items_approved: Object.values(itemAvailability).filter(Boolean).length,
          status_change: 'pending → approved',
          items: requestItems.map(item => ({
            name: item.product?.name || 'Producto',
            code: item.product?.code,
            quantity: item.quantity_requested,
            unit: item.unit_type,
            is_available: itemAvailability[item.id] ?? true,
          })),
        },
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['request', variables.requestId] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}

export function useRejectRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      approverId,
      approverName,
    }: {
      requestId: string
      approverId: string
      approverName: string
    }) => {
      // Get request details for email
      const { data: request } = await supabase
        .from('requests')
        .select(`
          location,
          requester:users!requester_id(email)
        `)
        .eq('id', requestId)
        .single()

      const { error } = await supabase
        .from('requests')
        .update({
          status: 'rejected',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (error) throw error

      // Send email notification to requester (async, don't block)
      if (request?.requester) {
        const requesterEmail = (request.requester as { email: string }).email

        sendRequestRejectedEmail({
          approverName,
          location: request.location,
          recipients: [requesterEmail],
        })
      }

      // Create audit log
      await createAuditLog({
        userId: approverId,
        action: 'request_rejected',
        entityType: 'request',
        entityId: requestId,
        location: request?.location,
        details: {
          approver_name: approverName,
          status_change: 'pending → rejected',
        },
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['request', variables.requestId] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}

export function useMarkDelivered() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      delivererId,
      delivererName,
    }: {
      requestId: string
      delivererId: string
      delivererName: string
    }) => {
      // Get request details with items for stock movement
      const { data: request } = await supabase
        .from('requests')
        .select(`
          location,
          requester:users!requester_id(email),
          items:request_items(
            id,
            product_id,
            quantity_requested,
            unit_type,
            is_available,
            product:products(format_ml, name, code)
          )
        `)
        .eq('id', requestId)
        .single()

      if (!request) throw new Error('Solicitud no encontrada')

      const { error } = await supabase
        .from('requests')
        .update({
          status: 'delivered',
          delivered_by: delivererId,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (error) throw error

      // Move stock: subtract from bodega and add to destination
      const items = request.items as Array<{
        id: string
        product_id: string
        quantity_requested: number
        unit_type: string
        is_available: boolean | null
        product: { format_ml: number; name: string; code: string } | null
      }>

      console.log('[useMarkDelivered] Processing items:', items.length)
      console.log('[useMarkDelivered] Destination location:', request.location)

      // Track stock movements for logging
      const stockMovements: Array<{
        product_name: string
        product_code: string
        quantity_moved: number
        unit: string
        bodega_before: number
        bodega_after: number
        destination_before: number
        destination_after: number
      }> = []

      for (const item of items) {
        // Only move stock for available items
        if (item.is_available === false) {
          console.log('[useMarkDelivered] Skipping unavailable item:', item.product?.name)
          continue
        }

        const formatMl = item.product?.format_ml || 750
        // Convert to ml based on unit type
        const quantityMl = item.unit_type === 'bottles'
          ? item.quantity_requested * formatMl
          : item.quantity_requested

        console.log(`[useMarkDelivered] Moving ${item.product?.name}: ${quantityMl}ml (${item.quantity_requested} ${item.unit_type})`)

        // Initialize movement tracking
        const movement = {
          product_name: item.product?.name || 'Producto',
          product_code: item.product?.code || 'N/A',
          quantity_moved: item.quantity_requested,
          unit: item.unit_type === 'bottles' ? 'botellas' : 'ml',
          bodega_before: 0,
          bodega_after: 0,
          destination_before: 0,
          destination_after: 0,
        }

        // Subtract from bodega
        const { data: bodegaInventory, error: bodegaFetchError } = await supabase
          .from('inventory')
          .select('quantity_ml')
          .eq('product_id', item.product_id)
          .eq('location', 'bodega')
          .single()

        if (bodegaFetchError) {
          console.error('[useMarkDelivered] Error fetching bodega inventory:', bodegaFetchError)
        }

        if (bodegaInventory) {
          movement.bodega_before = bodegaInventory.quantity_ml
          const newBodegaQty = Math.max(0, bodegaInventory.quantity_ml - quantityMl)
          movement.bodega_after = newBodegaQty
          console.log(`[useMarkDelivered] Bodega: ${bodegaInventory.quantity_ml}ml -> ${newBodegaQty}ml`)

          const { error: bodegaUpdateError } = await supabase
            .from('inventory')
            .update({ quantity_ml: newBodegaQty })
            .eq('product_id', item.product_id)
            .eq('location', 'bodega')

          if (bodegaUpdateError) {
            console.error('[useMarkDelivered] Error updating bodega inventory:', bodegaUpdateError)
            throw new Error(`Error al actualizar bodega: ${bodegaUpdateError.message}`)
          }
        } else {
          // No hay inventario en bodega para este producto - crear uno con 0
          console.warn('[useMarkDelivered] No bodega inventory found for product, creating with 0:', item.product?.name)
          movement.bodega_before = 0
          movement.bodega_after = 0

          // Opción: Crear registro con cantidad negativa o 0 para rastrear
          const { error: insertBodegaError } = await supabase
            .from('inventory')
            .insert({
              product_id: item.product_id,
              location: 'bodega',
              quantity_ml: 0, // El stock quedará en 0 o negativo conceptualmente
            })

          if (insertBodegaError && insertBodegaError.code !== '23505') {
            // 23505 = unique constraint violation (ya existe)
            console.error('[useMarkDelivered] Error creating bodega inventory:', insertBodegaError)
          }
        }

        // Add to destination (the request's location)
        const { data: destInventory, error: destFetchError } = await supabase
          .from('inventory')
          .select('quantity_ml')
          .eq('product_id', item.product_id)
          .eq('location', request.location)
          .single()

        if (destFetchError && destFetchError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is OK
          console.error('[useMarkDelivered] Error fetching destination inventory:', destFetchError)
        }

        if (destInventory) {
          movement.destination_before = destInventory.quantity_ml
          const newDestQty = destInventory.quantity_ml + quantityMl
          movement.destination_after = newDestQty
          console.log(`[useMarkDelivered] Destination ${request.location}: ${destInventory.quantity_ml}ml -> ${newDestQty}ml`)

          const { error: destUpdateError } = await supabase
            .from('inventory')
            .update({ quantity_ml: newDestQty })
            .eq('product_id', item.product_id)
            .eq('location', request.location)

          if (destUpdateError) {
            console.error('[useMarkDelivered] Error updating destination inventory:', destUpdateError)
            throw new Error(`Error al actualizar destino: ${destUpdateError.message}`)
          }
        } else {
          // Create new inventory entry for destination
          movement.destination_before = 0
          movement.destination_after = quantityMl
          console.log(`[useMarkDelivered] Creating new inventory at ${request.location}: ${quantityMl}ml`)

          const { error: insertError } = await supabase
            .from('inventory')
            .insert({
              product_id: item.product_id,
              location: request.location,
              quantity_ml: quantityMl,
            })

          if (insertError) {
            console.error('[useMarkDelivered] Error inserting destination inventory:', insertError)
            throw new Error(`Error al crear inventario destino: ${insertError.message}`)
          }
        }

        stockMovements.push(movement)
      }

      console.log('[useMarkDelivered] Stock movement completed successfully')

      // Create audit log with stock movement details
      await createAuditLog({
        userId: delivererId,
        action: 'request_delivered',
        entityType: 'request',
        entityId: requestId,
        location: request.location,
        details: {
          deliverer_name: delivererName,
          status_change: 'approved → delivered',
          destination: request.location,
          items_count: stockMovements.length,
          stock_movements: stockMovements,
        },
      })

      // Send email notification to requester (async, don't block)
      if (request?.requester) {
        const requesterEmail = (request.requester as { email: string }).email
        const deliveredItems = items.filter(i => i.is_available !== false)

        const emailItems = deliveredItems.map(item => ({
          name: item.product?.name || 'Producto',
          code: item.product?.code,
          quantity: item.quantity_requested,
          unit: item.unit_type === 'bottles' ? 'botellas' : 'ml',
        }))

        sendRequestDeliveredEmail({
          delivererName,
          location: request.location,
          itemsCount: deliveredItems.length,
          recipients: [requesterEmail],
          items: emailItems,
        })
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['request', variables.requestId] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}
