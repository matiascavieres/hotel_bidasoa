-- Migration 015: Admin functions for email update and password reset
-- Requires pgcrypto extension (enabled by default in Supabase)

-- Function to update a user's email (both auth.users and users table)
CREATE OR REPLACE FUNCTION admin_update_user_email(
    target_user_id UUID,
    new_email TEXT
)
RETURNS void AS $$
BEGIN
    IF get_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Solo administradores pueden cambiar emails';
    END IF;

    -- Update auth.users email
    UPDATE auth.users SET email = new_email, updated_at = NOW()
    WHERE id = target_user_id;

    -- Update users table email
    UPDATE users SET email = new_email, updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_update_user_email TO authenticated;

-- Function to reset a user's password (admin only)
CREATE OR REPLACE FUNCTION admin_reset_user_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS void AS $$
BEGIN
    IF get_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Solo administradores pueden resetear contraseñas';
    END IF;

    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Usa el cambio de contraseña normal para tu propia cuenta';
    END IF;

    IF length(new_password) < 6 THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres';
    END IF;

    -- Update password hash in auth.users
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_reset_user_password TO authenticated;
