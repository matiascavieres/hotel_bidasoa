-- Migration 017: Add must_change_password flag
-- When admin creates a user, this is set to true.
-- On first login the app forces the user to change their password.
-- After changing it, the flag is set back to false.

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Set all existing users to false (they already have their passwords)
UPDATE users SET must_change_password = false;
