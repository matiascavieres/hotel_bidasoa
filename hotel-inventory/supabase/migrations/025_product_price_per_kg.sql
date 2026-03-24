-- Add price_per_kg to products for auto-fill in recipe ingredients
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC;
