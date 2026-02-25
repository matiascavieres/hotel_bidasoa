-- ============================================================
-- 005_inbound_schema.sql
-- Inbound feature: proveedores, ingresos de stock desde proveedor
-- Idempotente: seguro de re-ejecutar
-- ============================================================

-- 1. Tabla suppliers (proveedores)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Agregar supplier_id a products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- 3. Tabla inbounds (cabecera del ingreso)
CREATE TABLE IF NOT EXISTS inbounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  invoice_number TEXT,
  notes TEXT,
  image_urls TEXT[] DEFAULT '{}',
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla inbound_items (ítems del ingreso)
CREATE TABLE IF NOT EXISTS inbound_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_id UUID NOT NULL REFERENCES inbounds(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_received NUMERIC NOT NULL CHECK (quantity_received > 0),
  unit_type unit_type NOT NULL DEFAULT 'bottles',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_inbounds_created_by ON inbounds(created_by);
CREATE INDEX IF NOT EXISTS idx_inbounds_received_at ON inbounds(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_items_inbound_id ON inbound_items(inbound_id);
CREATE INDEX IF NOT EXISTS idx_inbound_items_product_id ON inbound_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- 6. Función y triggers updated_at (idempotentes)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inbounds_updated_at ON inbounds;
CREATE TRIGGER update_inbounds_updated_at
  BEFORE UPDATE ON inbounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS Policies
-- ============================================================

-- Suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden ver proveedores" ON suppliers;
CREATE POLICY "Todos los usuarios autenticados pueden ver proveedores"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Solo admin puede crear proveedores" ON suppliers;
CREATE POLICY "Solo admin puede crear proveedores"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Solo admin puede actualizar proveedores" ON suppliers;
CREATE POLICY "Solo admin puede actualizar proveedores"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Solo admin puede eliminar proveedores" ON suppliers;
CREATE POLICY "Solo admin puede eliminar proveedores"
  ON suppliers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- Inbounds
ALTER TABLE inbounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin y bodeguero pueden ver inbounds" ON inbounds;
CREATE POLICY "Admin y bodeguero pueden ver inbounds"
  ON inbounds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'bodeguero')
    )
  );

DROP POLICY IF EXISTS "Admin y bodeguero pueden crear inbounds" ON inbounds;
CREATE POLICY "Admin y bodeguero pueden crear inbounds"
  ON inbounds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'bodeguero')
    )
  );

DROP POLICY IF EXISTS "Solo admin puede eliminar inbounds" ON inbounds;
CREATE POLICY "Solo admin puede eliminar inbounds"
  ON inbounds FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- Inbound Items
ALTER TABLE inbound_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin y bodeguero pueden ver inbound_items" ON inbound_items;
CREATE POLICY "Admin y bodeguero pueden ver inbound_items"
  ON inbound_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'bodeguero')
    )
  );

DROP POLICY IF EXISTS "Admin y bodeguero pueden crear inbound_items" ON inbound_items;
CREATE POLICY "Admin y bodeguero pueden crear inbound_items"
  ON inbound_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'bodeguero')
    )
  );

DROP POLICY IF EXISTS "Solo admin puede eliminar inbound_items" ON inbound_items;
CREATE POLICY "Solo admin puede eliminar inbound_items"
  ON inbound_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- ============================================================
-- Supabase Storage: bucket inbound-images
-- (Crear manualmente en el dashboard de Supabase > Storage)
-- ============================================================
