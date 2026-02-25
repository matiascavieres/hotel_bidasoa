import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  sendTransferCreatedEmail,
  sendTransferCompletedEmail,
  getBodegueroEmails,
} from '@/lib/email'
import type { TransferStatus, LocationType, CartItem } from '@/types'

export function useTransfers(statusFilter?: TransferStatus | 'all') {
  return useQuery({
    queryKey: ['transfers', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('transfers')
        .select(`
          *,
          creator:users!created_by(*),
          confirmer:users!confirmed_by(*),
          items:transfer_items(
            *,
            product:products(*)
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
  })
}

export function useTransfer(id: string) {
  return useQuery({
    queryKey: ['transfer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          creator:users!created_by(*),
          confirmer:users!confirmed_by(*),
          items:transfer_items(
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

export function useCreateTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      fromLocation,
      toLocation,
      items,
      notes,
      creatorId,
      creatorName,
      imageFiles,
    }: {
      fromLocation: LocationType
      toLocation: LocationType
      items: CartItem[]
      notes?: string
      creatorId: string
      creatorName: string
      imageFiles?: File[]
    }) => {
      // 1. Upload images to Supabase Storage
      const imageUrls: string[] = []
      for (const file of imageFiles || []) {
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`
        const filePath = `${creatorId}/${fileName}`
        const { error: uploadError } = await supabase.storage
          .from('request-images')
          .upload(filePath, file, { contentType: file.type })
        if (uploadError) {
          console.error('Error uploading image:', uploadError)
          continue
        }
        imageUrls.push(filePath)
      }

      // 2. Create the transfer
      const { data: transfer, error: transferError } = await supabase
        .from('transfers')
        .insert({
          from_location: fromLocation,
          to_location: toLocation,
          created_by: creatorId,
          notes,
          status: 'pending',
          image_urls: imageUrls,
        })
        .select()
        .single()

      if (transferError) throw transferError

      // Create transfer items
      const transferItems = items.map((item) => ({
        transfer_id: transfer.id,
        product_id: item.product.id,
        quantity_ml:
          item.unit_type === 'bottles'
            ? item.quantity * (item.product.format_ml || 750)
            : item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('transfer_items')
        .insert(transferItems)

      if (itemsError) throw itemsError

      // Subtract from source inventory
      for (const transferItem of transferItems) {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('quantity_ml')
          .eq('product_id', transferItem.product_id)
          .eq('location', fromLocation)
          .single()

        if (inventory) {
          await supabase
            .from('inventory')
            .update({
              quantity_ml: Math.max(
                0,
                inventory.quantity_ml - transferItem.quantity_ml
              ),
            })
            .eq('product_id', transferItem.product_id)
            .eq('location', fromLocation)
        }
      }

      // Send email notification to destination location (async, don't block)
      getBodegueroEmails(toLocation).then(emails => {
        if (emails.length > 0) {
          sendTransferCreatedEmail({
            fromLocation,
            toLocation,
            itemsCount: items.length,
            creatorName,
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

      return transfer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useConfirmTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      transferId,
      confirmerId,
      confirmerName,
    }: {
      transferId: string
      confirmerId: string
      confirmerName: string
    }) => {
      // Get the transfer with items
      const { data: transfer, error: fetchError } = await supabase
        .from('transfers')
        .select(`
          *,
          items:transfer_items(
            *,
            product:products(name, code, format_ml)
          )
        `)
        .eq('id', transferId)
        .single()

      if (fetchError) throw fetchError

      // Update transfer status
      const { error: updateError } = await supabase
        .from('transfers')
        .update({
          status: 'completed',
          confirmed_by: confirmerId,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', transferId)

      if (updateError) throw updateError

      // Add to destination inventory
      for (const item of transfer.items) {
        const { data: existingInventory } = await supabase
          .from('inventory')
          .select('quantity_ml')
          .eq('product_id', item.product_id)
          .eq('location', transfer.to_location)
          .single()

        if (existingInventory) {
          await supabase
            .from('inventory')
            .update({
              quantity_ml: existingInventory.quantity_ml + item.quantity_ml,
            })
            .eq('product_id', item.product_id)
            .eq('location', transfer.to_location)
        } else {
          await supabase.from('inventory').insert({
            product_id: item.product_id,
            location: transfer.to_location,
            quantity_ml: item.quantity_ml,
          })
        }
      }

      // Send email notification to origin location (async, don't block)
      getBodegueroEmails(transfer.from_location).then(emails => {
        if (emails.length > 0) {
          const emailItems = transfer.items.map((item: {
            quantity_ml: number
            product: { name: string; code: string; format_ml: number | null } | null
          }) => {
            const formatMl = item.product?.format_ml || 750
            const bottles = Math.round(item.quantity_ml / formatMl * 10) / 10
            return {
              name: item.product?.name || 'Producto',
              code: item.product?.code,
              quantity: bottles,
              unit: 'botellas',
            }
          })

          sendTransferCompletedEmail({
            fromLocation: transfer.from_location,
            toLocation: transfer.to_location,
            itemsCount: transfer.items.length,
            confirmerName,
            recipients: emails,
            items: emailItems,
          })
        }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
