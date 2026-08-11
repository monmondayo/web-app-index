-- Existing databases only: add private app visibility and encrypted GitHub token storage.
-- Fresh databases already receive these columns from schema.sql.
ALTER TABLE users ADD COLUMN github_access_token TEXT;
ALTER TABLE apps ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1));
CREATE INDEX IF NOT EXISTS idx_apps_visibility ON apps(is_private, user_id);
