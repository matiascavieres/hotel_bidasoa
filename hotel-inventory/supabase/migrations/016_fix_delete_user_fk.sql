-- Migration 016: Fix admin_delete_user 409 Conflict
-- Change FK constraints from RESTRICT to SET NULL so users can be deleted
-- while preserving historical records (requests, transfers, audit_logs, etc.)

-- 1. requests.requester_id: RESTRICT → SET NULL, make nullable
ALTER TABLE requests ALTER COLUMN requester_id DROP NOT NULL;
ALTER TABLE requests DROP CONSTRAINT requests_requester_id_fkey;
ALTER TABLE requests ADD CONSTRAINT requests_requester_id_fkey
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE SET NULL;

-- 2. transfers.created_by: RESTRICT → SET NULL, make nullable
ALTER TABLE transfers ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE transfers DROP CONSTRAINT transfers_created_by_fkey;
ALTER TABLE transfers ADD CONSTRAINT transfers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. inbounds.created_by: RESTRICT → SET NULL, make nullable
ALTER TABLE inbounds ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE inbounds DROP CONSTRAINT inbounds_created_by_fkey;
ALTER TABLE inbounds ADD CONSTRAINT inbounds_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 4. audit_logs.user_id: RESTRICT → SET NULL, make nullable
ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_user_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 5. sales_imports.imported_by: NO ACTION → SET NULL, make nullable
ALTER TABLE sales_imports ALTER COLUMN imported_by DROP NOT NULL;
ALTER TABLE sales_imports DROP CONSTRAINT sales_imports_imported_by_fkey;
ALTER TABLE sales_imports ADD CONSTRAINT sales_imports_imported_by_fkey
  FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL;
