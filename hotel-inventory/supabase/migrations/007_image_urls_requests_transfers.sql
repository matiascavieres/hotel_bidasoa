-- Migration 007: Add image_urls to requests and transfers
-- Allows attaching photos when creating a solicitud or traspaso

-- Add image_urls to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- Add image_urls to transfers table
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- Create storage bucket for request/transfer images (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-images',
  'request-images',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Authenticated can upload request images'
  ) THEN
    CREATE POLICY "Authenticated can upload request images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'request-images');
  END IF;
END $$;

-- RLS: authenticated users can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Authenticated can read request images'
  ) THEN
    CREATE POLICY "Authenticated can read request images"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'request-images');
  END IF;
END $$;
