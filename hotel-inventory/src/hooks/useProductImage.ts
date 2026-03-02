import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const BUCKET = 'product-images'

/**
 * Upload a product image to Supabase Storage.
 * Returns the storage file path (not the URL).
 */
export async function uploadProductImage(
  productId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`
  const filePath = `products/${productId}/${fileName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { contentType: file.type })

  if (error) throw error
  return filePath
}

/**
 * Delete a product image from storage.
 */
export async function deleteProductImage(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath])

  if (error) {
    console.error('Error deleting product image:', error)
  }
}

/**
 * Hook: generate a signed URL for a product image path.
 * Returns null while loading, or the signed URL string.
 */
export function useProductImageUrl(imagePath: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!imagePath) {
      setSignedUrl(null)
      return
    }

    let cancelled = false

    supabase.storage
      .from(BUCKET)
      .createSignedUrl(imagePath, 60 * 60) // 1 hour
      .then(({ data, error }) => {
        if (!cancelled) {
          setSignedUrl(error ? null : data?.signedUrl || null)
        }
      })

    return () => { cancelled = true }
  }, [imagePath])

  return { signedUrl }
}
