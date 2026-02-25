import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CartItem, Inbound } from '@/types'

export function useInbounds() {
  return useQuery({
    queryKey: ['inbounds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbounds')
        .select(`
          *,
          creator:users!created_by(*),
          items:inbound_items(
            *,
            product:products(
              *,
              category:categories(*),
              supplier:suppliers(*)
            )
          )
        `)
        .order('received_at', { ascending: false })

      if (error) throw error
      return data as unknown as Inbound[]
    },
  })
}

export function useInbound(id: string) {
  return useQuery({
    queryKey: ['inbound', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbounds')
        .select(`
          *,
          creator:users!created_by(*),
          items:inbound_items(
            *,
            product:products(
              *,
              category:categories(*),
              supplier:suppliers(*)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as unknown as Inbound
    },
    enabled: !!id,
  })
}

export function useCreateInbound() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      items,
      invoiceNumber,
      notes,
      imageFiles,
      creatorId,
    }: {
      items: CartItem[]
      invoiceNumber?: string
      notes?: string
      imageFiles: File[]
      creatorId: string
    }) => {
      // 1. Upload images to Supabase Storage
      const imageUrls: string[] = []

      for (const file of imageFiles) {
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`
        const filePath = `${creatorId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('inbound-images')
          .upload(filePath, file, { contentType: file.type })

        if (uploadError) {
          console.error('Error uploading image:', uploadError)
          // Continue without this image
          continue
        }

        // Guardamos el path, no la URL pública (bucket privado)
        imageUrls.push(filePath)
      }

      // 2. Create inbound record
      const { data: inbound, error: inboundError } = await supabase
        .from('inbounds')
        .insert({
          created_by: creatorId,
          invoice_number: invoiceNumber || null,
          notes: notes || null,
          image_urls: imageUrls,
          received_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (inboundError) throw inboundError

      // 3. Calculate quantities and create inbound_items
      const inboundItems = items.map((item) => {
        const quantityMl =
          item.unit_type === 'bottles'
            ? item.quantity * (item.product.format_ml || 750)
            : item.quantity

        return {
          inbound_id: inbound.id,
          product_id: item.product.id,
          quantity_received: item.quantity,
          unit_type: item.unit_type,
          // Store quantity_ml for inventory update
          _quantity_ml: quantityMl,
        }
      })

      const { error: itemsError } = await supabase
        .from('inbound_items')
        .insert(
          inboundItems.map(({ _quantity_ml: _q, ...rest }) => rest)
        )

      if (itemsError) throw itemsError

      // 4. Update bodega inventory (increase stock)
      for (const item of inboundItems) {
        const { data: existing } = await supabase
          .from('inventory')
          .select('id, quantity_ml')
          .eq('product_id', item.product_id)
          .eq('location', 'bodega')
          .single()

        if (existing) {
          await supabase
            .from('inventory')
            .update({ quantity_ml: existing.quantity_ml + item._quantity_ml })
            .eq('id', existing.id)
        } else {
          await supabase.from('inventory').insert({
            product_id: item.product_id,
            location: 'bodega',
            quantity_ml: item._quantity_ml,
          })
        }
      }

      // 5. Create audit log
      await supabase.from('audit_logs').insert({
        user_id: creatorId,
        action: 'inbound_received',
        entity_type: 'inbound',
        entity_id: inbound.id,
        location: 'bodega',
        details: {
          invoice_number: invoiceNumber || null,
          items_count: items.length,
          image_count: imageUrls.length,
          items: items.map((item) => ({
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_type: item.unit_type,
          })),
        },
      })

      return inbound
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbounds'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
