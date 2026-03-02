-- Migration 018: Server-side user creation to avoid admin session switch
-- The old approach used supabase.auth.signUp() which changes the admin's session
-- to the new user. This RPC creates the user entirely server-side.

CREATE OR REPLACE FUNCTION admin_create_full_user(
    user_email TEXT,
    user_password TEXT,
    user_full_name TEXT,
    user_role user_role,
    user_location location_type DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Only admins can create users
    IF get_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Solo administradores pueden crear usuarios';
    END IF;

    -- Validate password length
    IF length(user_password) < 6 THEN
        RAISE EXCEPTION 'La contrasena debe tener al menos 6 caracteres';
    END IF;

    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
        RAISE EXCEPTION 'Ya existe un usuario con ese email';
    END IF;

    -- Generate UUID
    new_user_id := gen_random_uuid();

    -- Create auth user (email pre-confirmed, password hashed with bcrypt)
    INSERT INTO auth.users (
        id, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        aud, role, instance_id
    ) VALUES (
        new_user_id,
        user_email,
        crypt(user_password, gen_salt('bf')),
        NOW(),  -- email pre-confirmed so they can login immediately
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', user_full_name),
        'authenticated',
        'authenticated',
        '00000000-0000-0000-0000-000000000000'::UUID
    );

    -- Create identity record (required by Supabase auth)
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', user_email),
        'email',
        new_user_id::text,
        NOW(), NOW(), NOW()
    );

    -- Create user profile with must_change_password = true
    INSERT INTO users (id, email, full_name, role, location, is_active, must_change_password)
    VALUES (new_user_id, user_email, user_full_name, user_role, user_location, true, true)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        location = EXCLUDED.location,
        is_active = true,
        must_change_password = true,
        updated_at = NOW();

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_create_full_user TO authenticated;
