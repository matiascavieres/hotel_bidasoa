-- Migration 008: Add importe columns to sales_data + rejection_notes to requests

-- ===========================================
-- 1. Sales importe columns
-- ===========================================
ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS importe_unitario NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS importe_total NUMERIC(12,2) DEFAULT 0;

-- ===========================================
-- 2. Rejection notes for requests
-- ===========================================
ALTER TABLE requests ADD COLUMN IF NOT EXISTS rejection_notes TEXT DEFAULT NULL;
