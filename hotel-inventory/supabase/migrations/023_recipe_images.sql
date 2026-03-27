-- ============================================================
-- Migración 023: Imágenes en recetas
-- ============================================================
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
