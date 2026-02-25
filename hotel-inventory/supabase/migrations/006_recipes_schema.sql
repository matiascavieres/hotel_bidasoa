-- ============================================================
-- Migración 006: Recetas y Sistema de Importación de Ventas
-- ============================================================

-- Tabla recipes: catálogo de recetas de cócteles
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla recipe_ingredients: ingredientes de cada receta
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_ml NUMERIC NOT NULL CHECK (quantity_ml > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla sales_imports: historial de importaciones de ventas
CREATE TABLE IF NOT EXISTS sales_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by UUID NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  import_date DATE NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  matched_recipes INT NOT NULL DEFAULT 0,
  unmatched_recipes INT NOT NULL DEFAULT 0,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_is_active ON recipes(is_active);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product_id ON recipe_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_imports_imported_by ON sales_imports(imported_by);
CREATE INDEX IF NOT EXISTS idx_sales_imports_import_date ON sales_imports(import_date);

-- Trigger updated_at para recipes
DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_imports ENABLE ROW LEVEL SECURITY;

-- Policies para recipes
DROP POLICY IF EXISTS "recipes_select_authenticated" ON recipes;
CREATE POLICY "recipes_select_authenticated"
  ON recipes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "recipes_insert_admin" ON recipes;
CREATE POLICY "recipes_insert_admin"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "recipes_update_admin" ON recipes;
CREATE POLICY "recipes_update_admin"
  ON recipes FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "recipes_delete_admin" ON recipes;
CREATE POLICY "recipes_delete_admin"
  ON recipes FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Policies para recipe_ingredients
DROP POLICY IF EXISTS "recipe_ingredients_select_authenticated" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_select_authenticated"
  ON recipe_ingredients FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "recipe_ingredients_insert_admin" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_insert_admin"
  ON recipe_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "recipe_ingredients_update_admin" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_update_admin"
  ON recipe_ingredients FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "recipe_ingredients_delete_admin" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_delete_admin"
  ON recipe_ingredients FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Policies para sales_imports
DROP POLICY IF EXISTS "sales_imports_select_staff" ON sales_imports;
CREATE POLICY "sales_imports_select_staff"
  ON sales_imports FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin', 'bodeguero'));

DROP POLICY IF EXISTS "sales_imports_insert_staff" ON sales_imports;
CREATE POLICY "sales_imports_insert_staff"
  ON sales_imports FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'bodeguero'));
