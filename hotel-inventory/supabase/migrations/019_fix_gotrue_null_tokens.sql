-- Migration 019: Fix GoTrue 500 "Database error querying schema"
-- GoTrue (Go) cannot scan NULL into string fields. Token columns in auth.users
-- must be empty strings '', not NULL.
-- Reference: https://github.com/supabase/auth/issues/1940

-- ============================================================
-- PART 1: Fix existing NULL token columns in auth.users
-- This is the immediate fix for the 500 error on signInWithPassword
-- ============================================================

-- Note: phone column has a UNIQUE constraint in auth.users, so we skip it
-- (phone auth is not used in this project)
UPDATE auth.users SET
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL
   OR email_change_token_current IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;

-- ============================================================
-- PART 2: Patch admin_create_full_user to include all required columns
-- Prevents future users from having NULL token fields
-- ============================================================

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

    -- Create auth user with ALL required columns (no NULLs for string fields)
    -- Note: phone left as NULL because it has a UNIQUE constraint
    INSERT INTO auth.users (
        id, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        aud, role, instance_id,
        -- Token columns must be '' not NULL for GoTrue Go scanner
        confirmation_token, recovery_token,
        email_change, email_change_token_new, email_change_token_current,
        phone_change, phone_change_token,
        reauthentication_token, email_change_confirm_status,
        is_sso_user
    ) VALUES (
        new_user_id,
        user_email,
        crypt(user_password, gen_salt('bf')),
        NOW(),  -- email pre-confirmed
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', user_full_name),
        'authenticated',
        'authenticated',
        '00000000-0000-0000-0000-000000000000'::UUID,
        '', '',       -- confirmation_token, recovery_token
        '', '', '',   -- email_change, email_change_token_new, email_change_token_current
        '', '',       -- phone_change, phone_change_token
        '',           -- reauthentication_token
        0,            -- email_change_confirm_status
        false         -- is_sso_user
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

-- ============================================================
-- PART 3: Harden SECURITY DEFINER functions with explicit search_path
-- Prevents search_path injection attacks
-- ============================================================

ALTER FUNCTION get_user_role() SET search_path = public;
ALTER FUNCTION get_user_location() SET search_path = public;
-- Note: handle_new_user() does not exist in this project (trigger was never created)
ALTER FUNCTION admin_create_full_user(TEXT, TEXT, TEXT, user_role, location_type) SET search_path = public, auth, extensions;
ALTER FUNCTION admin_delete_user(UUID) SET search_path = public, auth;
ALTER FUNCTION admin_update_user_email(UUID, TEXT) SET search_path = public, auth;
ALTER FUNCTION admin_reset_user_password(UUID, TEXT) SET search_path = public, auth;
ALTER FUNCTION admin_create_user_profile(UUID, TEXT, TEXT, user_role, location_type) SET search_path = public, auth;
