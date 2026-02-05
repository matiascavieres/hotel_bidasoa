-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;

-- =====================
-- USERS POLICIES
-- =====================

-- All authenticated users can read all users
CREATE POLICY "Users can view all users"
    ON users FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert users
CREATE POLICY "Only admins can create users"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'admin');

-- Only admins can update users
CREATE POLICY "Only admins can update users"
    ON users FOR UPDATE
    TO authenticated
    USING (get_user_role() = 'admin');

-- Users can update their own profile (limited fields handled in app)
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- =====================
-- CATEGORIES POLICIES
-- =====================

-- All authenticated users can read categories
CREATE POLICY "All users can view categories"
    ON categories FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify categories
CREATE POLICY "Only admins can create categories"
    ON categories FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Only admins can update categories"
    ON categories FOR UPDATE
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY "Only admins can delete categories"
    ON categories FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- =====================
-- PRODUCTS POLICIES
-- =====================

-- All authenticated users can read products
CREATE POLICY "All users can view products"
    ON products FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify products
CREATE POLICY "Only admins can create products"
    ON products FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Only admins can update products"
    ON products FOR UPDATE
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY "Only admins can delete products"
    ON products FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- =====================
-- INVENTORY POLICIES
-- =====================

-- All authenticated users can read inventory
CREATE POLICY "All users can view inventory"
    ON inventory FOR SELECT
    TO authenticated
    USING (true);

-- Admins and bodegueros can modify inventory
CREATE POLICY "Admins and bodegueros can create inventory"
    ON inventory FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'bodeguero'));

CREATE POLICY "Admins and bodegueros can update inventory"
    ON inventory FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'bodeguero'));

-- =====================
-- REQUESTS POLICIES
-- =====================

-- All authenticated users can view requests
-- Bartenders see only their own, others see all
CREATE POLICY "Users can view requests"
    ON requests FOR SELECT
    TO authenticated
    USING (
        get_user_role() IN ('admin', 'bodeguero')
        OR requester_id = auth.uid()
    );

-- All authenticated users can create requests
CREATE POLICY "All users can create requests"
    ON requests FOR INSERT
    TO authenticated
    WITH CHECK (requester_id = auth.uid());

-- Admins and bodegueros can update requests
CREATE POLICY "Admins and bodegueros can update requests"
    ON requests FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'bodeguero'));

-- =====================
-- REQUEST ITEMS POLICIES
-- =====================

-- View policy follows parent request
CREATE POLICY "Users can view request items"
    ON request_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM requests
            WHERE requests.id = request_items.request_id
            AND (
                get_user_role() IN ('admin', 'bodeguero')
                OR requests.requester_id = auth.uid()
            )
        )
    );

-- Can create items for own requests
CREATE POLICY "Users can create request items"
    ON request_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM requests
            WHERE requests.id = request_items.request_id
            AND requests.requester_id = auth.uid()
            AND requests.status = 'pending'
        )
    );

-- Admins and bodegueros can update request items
CREATE POLICY "Admins and bodegueros can update request items"
    ON request_items FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'bodeguero'));

-- =====================
-- TRANSFERS POLICIES
-- =====================

-- All authenticated users can view transfers
CREATE POLICY "All users can view transfers"
    ON transfers FOR SELECT
    TO authenticated
    USING (true);

-- Admins and bodegueros can create transfers
CREATE POLICY "Admins and bodegueros can create transfers"
    ON transfers FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'bodeguero'));

-- Admins and bodegueros can update transfers
CREATE POLICY "Admins and bodegueros can update transfers"
    ON transfers FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'bodeguero'));

-- =====================
-- TRANSFER ITEMS POLICIES
-- =====================

-- All authenticated users can view transfer items
CREATE POLICY "All users can view transfer items"
    ON transfer_items FOR SELECT
    TO authenticated
    USING (true);

-- Admins and bodegueros can create transfer items
CREATE POLICY "Admins and bodegueros can create transfer items"
    ON transfer_items FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'bodeguero'));

-- =====================
-- AUDIT LOGS POLICIES
-- =====================

-- Admins can view all logs, others can view their own
CREATE POLICY "Users can view audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (
        get_user_role() = 'admin'
        OR user_id = auth.uid()
    );

-- All authenticated users can create logs
CREATE POLICY "All users can create audit logs"
    ON audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- No updates or deletes allowed on audit logs (immutable)

-- =====================
-- ALERT CONFIGS POLICIES
-- =====================

-- All authenticated users can view alert configs
CREATE POLICY "All users can view alert configs"
    ON alert_configs FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify alert configs
CREATE POLICY "Only admins can create alert configs"
    ON alert_configs FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Only admins can update alert configs"
    ON alert_configs FOR UPDATE
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY "Only admins can delete alert configs"
    ON alert_configs FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- =====================
-- REALTIME SUBSCRIPTIONS
-- =====================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
ALTER PUBLICATION supabase_realtime ADD TABLE transfers;
