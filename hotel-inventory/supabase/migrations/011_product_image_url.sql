-- Migration 011: Add image_url to products and create product-images storage bucket

-- 1. Add image_url column to products table (single image path, nullable)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create storage bucket for product images (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  false,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS: authenticated users can upload product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Authenticated can upload product images'
  ) THEN
    CREATE POLICY "Authenticated can upload product images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'product-images');
  END IF;
END $$;

-- 4. RLS: authenticated users can read product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Authenticated can read product images'
  ) THEN
    CREATE POLICY "Authenticated can read product images"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- 5. RLS: authenticated users can update (replace) product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Authenticated can update product images'
  ) THEN
    CREATE POLICY "Authenticated can update product images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- 6. RLS: authenticated users can delete old product images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Authenticated can delete product images'
  ) THEN
    CREATE POLICY "Authenticated can delete product images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'product-images');
  END IF;
END $$;
