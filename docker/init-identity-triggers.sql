-- ─────────────────────────────────────────────────────────────
-- SYNAPSE PostgreSQL Database-Level Session Auto-Revocation
-- Enforces 1-hour idle timeout & auto-revocation in PostgreSQL
-- ─────────────────────────────────────────────────────────────

\connect identity_db;

-- 1. Create table structure if not created yet
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture_url VARCHAR(500),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent VARCHAR(512),
    last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    token_hash VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id ON refresh_tokens(session_id);

-- 2. PL/pgSQL Function: Auto-revoke sessions inactive for > 1 hour or expired
CREATE OR REPLACE FUNCTION fn_revoke_inactive_sessions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM sessions
    WHERE last_activity < (CURRENT_TIMESTAMP - INTERVAL '1 hour')
       OR expires_at < CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Database Triggers for Sessions & Refresh Tokens
DROP TRIGGER IF EXISTS trg_auto_revoke_on_session ON sessions;
CREATE TRIGGER trg_auto_revoke_on_session
BEFORE INSERT OR UPDATE ON sessions
FOR EACH STATEMENT
EXECUTE FUNCTION fn_revoke_inactive_sessions();

DROP TRIGGER IF EXISTS trg_auto_revoke_on_token ON refresh_tokens;
CREATE TRIGGER trg_auto_revoke_on_token
BEFORE INSERT OR UPDATE ON refresh_tokens
FOR EACH STATEMENT
EXECUTE FUNCTION fn_revoke_inactive_sessions();

-- 4. PL/pgSQL Function: Auto-touch last_activity on session updates
CREATE OR REPLACE FUNCTION fn_update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_last_activity ON sessions;
CREATE TRIGGER trg_touch_last_activity
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION fn_update_last_activity();
