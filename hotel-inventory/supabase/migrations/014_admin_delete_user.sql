-- Migration 014: Allow admins to delete users via RPC
-- Follows the pattern of 003_admin_create_user.sql (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Only admins can delete users
    IF get_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Solo administradores pueden eliminar usuarios';
    END IF;

    -- Cannot delete yourself
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'No puedes eliminar tu propia cuenta';
    END IF;

    -- Delete from auth.users → CASCADE deletes from users table
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_delete_user TO authenticated;
