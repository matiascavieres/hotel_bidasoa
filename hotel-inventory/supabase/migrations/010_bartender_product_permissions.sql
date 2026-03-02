-- Allow bartenders to update products during inventory mode (for scanning barcodes)
DROP POLICY IF EXISTS "Only admins can update products" ON products;
CREATE POLICY "Authorized users can update products"
    ON products FOR UPDATE TO authenticated
    USING (
        get_user_role()::text = 'admin'
        OR (
            get_user_role()::text = 'bartender'
            AND is_inventory_mode_enabled()
        )
    );

-- Allow bartenders to create products during inventory mode
DROP POLICY IF EXISTS "Only admins can create products" ON products;
CREATE POLICY "Authorized users can create products"
    ON products FOR INSERT TO authenticated
    WITH CHECK (
        get_user_role()::text = 'admin'
        OR (
            get_user_role()::text = 'bartender'
            AND is_inventory_mode_enabled()
        )
    );
