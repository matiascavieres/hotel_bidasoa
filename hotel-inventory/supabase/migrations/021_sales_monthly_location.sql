-- Migration: 021_sales_monthly_location.sql
-- Add location column to sales_monthly to track which restaurant (Casa Sanz / Bidasoa)
-- each sales record belongs to.

-- 1. Add location column (existing rows default to '' = unlocated legacy data)
ALTER TABLE sales_monthly
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';

-- 2. Drop old unique constraint (only covered year, month, receta)
ALTER TABLE sales_monthly
  DROP CONSTRAINT IF EXISTS uq_sales_monthly_receta_period;

-- 3. New unique constraint includes location
--    This allows Casa Sanz and Bidasoa to have separate rows for the same recipe/month
ALTER TABLE sales_monthly
  ADD CONSTRAINT uq_sales_monthly_receta_period_location
    UNIQUE (year, month, receta, location);

-- 4. Index for location-based filtering
CREATE INDEX IF NOT EXISTS idx_sales_monthly_location
  ON sales_monthly (location);

-- Verify
SELECT COUNT(*) AS total_records, COUNT(DISTINCT location) AS distinct_locations FROM sales_monthly;
