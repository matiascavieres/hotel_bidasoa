-- Function to allow admins to create user profiles directly
-- This bypasses RLS for user creation when called by an admin

CREATE OR REPLACE FUNCTION admin_create_user_profile(
    user_id UUID,
    user_email TEXT,
    user_full_name TEXT,
    user_role user_role,
    user_location location_type DEFAULT NULL
)
RETURNS users AS $$
DECLARE
    created_user users;
BEGIN
    -- Check if caller is admin
    IF get_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Only admins can create user profiles';
    END IF;

    -- Insert or update the user profile
    INSERT INTO users (id, email, full_name, role, location, is_active)
    VALUES (user_id, user_email, user_full_name, user_role, user_location, true)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        location = EXCLUDED.location,
        is_active = true,
        updated_at = NOW()
    RETURNING * INTO created_user;

    RETURN created_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_create_user_profile TO authenticated;

-- Also update the RLS policy to allow the trigger to insert
-- Drop and recreate the insert policy to allow service_role and trigger inserts
DROP POLICY IF EXISTS "Only admins can create users" ON users;

CREATE POLICY "Allow user profile creation"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Allow if user is admin
        get_user_role() = 'admin'
        -- Or allow if inserting own profile (for trigger/signup flow)
        OR id = auth.uid()
    );
