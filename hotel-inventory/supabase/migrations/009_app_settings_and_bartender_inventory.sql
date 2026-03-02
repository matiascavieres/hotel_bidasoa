-- =====================
-- APP SETTINGS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Default settings
INSERT INTO app_settings (key, value) VALUES ('inventory_mode', '{"enabled": false}')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read settings"
    ON app_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can update settings"
    ON app_settings FOR UPDATE
    TO authenticated
    USING (get_user_role()::text = 'admin');

-- Trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- HELPER FUNCTION
-- =====================

CREATE OR REPLACE FUNCTION is_inventory_mode_enabled()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT (value->>'enabled')::boolean FROM app_settings WHERE key = 'inventory_mode'),
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- UPDATE INVENTORY POLICIES
-- =====================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins and bodegueros can create inventory" ON inventory;
DROP POLICY IF EXISTS "Admins and bodegueros can update inventory" ON inventory;

-- Recreate with bartender access when inventory mode is active
-- Use explicit ::text casts to avoid enum comparison errors
CREATE POLICY "Authorized users can create inventory"
    ON inventory FOR INSERT
    TO authenticated
    WITH CHECK (
        get_user_role()::text IN ('admin', 'bodeguero')
        OR (
            get_user_role()::text = 'bartender'
            AND is_inventory_mode_enabled()
            AND location::text = get_user_location()::text
        )
    );

CREATE POLICY "Authorized users can update inventory"
    ON inventory FOR UPDATE
    TO authenticated
    USING (
        get_user_role()::text IN ('admin', 'bodeguero')
        OR (
            get_user_role()::text = 'bartender'
            AND is_inventory_mode_enabled()
            AND location::text = get_user_location()::text
        )
    );
