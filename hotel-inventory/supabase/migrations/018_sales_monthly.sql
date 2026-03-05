-- Migration: 018_sales_monthly.sql
-- Monthly sales data for date-range analysis.
-- Each row represents aggregated sales for one recipe in one calendar month.

-- 1. Create table
CREATE TABLE IF NOT EXISTS sales_monthly (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  receta      text        NOT NULL,
  grupo       text        NOT NULL DEFAULT '',
  familia     text        NOT NULL DEFAULT '',
  year        integer     NOT NULL,
  month       integer     NOT NULL CHECK (month BETWEEN 1 AND 12),
  cantidad    integer     NOT NULL DEFAULT 0,
  importe_unitario integer NOT NULL DEFAULT 0,
  importe_total    integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Unique sales record per recipe per month
ALTER TABLE sales_monthly
  ADD CONSTRAINT uq_sales_monthly_receta_period UNIQUE (year, month, receta);

-- Indices
CREATE INDEX IF NOT EXISTS idx_sales_monthly_period  ON sales_monthly (year, month);
CREATE INDEX IF NOT EXISTS idx_sales_monthly_familia ON sales_monthly (familia);
CREATE INDEX IF NOT EXISTS idx_sales_monthly_grupo   ON sales_monthly (grupo);
CREATE INDEX IF NOT EXISTS idx_sales_monthly_importe ON sales_monthly (importe_total DESC);

-- 2. Enable RLS
ALTER TABLE sales_monthly ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view sales_monthly"
  ON sales_monthly FOR SELECT TO authenticated
  USING (true);

-- Admins can insert / update / delete
CREATE POLICY "Admin can manage sales_monthly"
  ON sales_monthly FOR ALL TO authenticated
  USING     (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- 3. Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_sales_monthly_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sales_monthly_updated_at
  BEFORE UPDATE ON sales_monthly
  FOR EACH ROW EXECUTE FUNCTION update_sales_monthly_updated_at();

-- Verify
SELECT COUNT(*) AS total_records FROM sales_monthly;
