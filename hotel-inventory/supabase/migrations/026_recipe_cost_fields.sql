-- ============================================================
-- Migración 021: Campos de costo en recetas
-- ============================================================

-- Agregar unit y price_per_kg a recipe_ingredients
ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'ml'
    CHECK (unit IN ('gr', 'kg', 'ml', 'lt')),
  ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC;

-- Agregar portions a recipes
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS portions INTEGER NOT NULL DEFAULT 1;
