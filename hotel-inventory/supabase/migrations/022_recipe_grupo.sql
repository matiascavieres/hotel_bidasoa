-- ============================================================
-- Migración 022: Campo grupo en recetas
-- ============================================================

-- Grupo de plato/cóctel (ej: "Salados del Futuro", "Mixología", "Jugos")
-- Permite cruzar con el campo Grupo de los reportes de ventas FNS
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS grupo TEXT;
