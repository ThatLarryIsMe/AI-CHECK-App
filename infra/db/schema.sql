-- Phase B: base tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued','processing','complete','failed')),
    input_text TEXT,
    pack_id UUID,
    error TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packs (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id),
    version INTEGER NOT NULL DEFAULT 1,
    engine_version TEXT NOT NULL DEFAULT '1.0.0-lite',
    pack_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY,
    pack_id UUID NOT NULL REFERENCES packs(id),
    claim_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY,
    claim_id UUID NOT NULL REFERENCES claims(id),
    source_url TEXT,
    snippet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phase F1: waitlist
CREATE TABLE IF NOT EXISTS waitlist_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phase F2: idempotent migrations for existing DBs
-- Makes user_id nullable (no sentinel UUID needed for anonymous jobs)
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS input_text TEXT,
    ADD COLUMN IF NOT EXISTS pack_id UUID,
    ADD COLUMN IF NOT EXISTS error TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Drop NOT NULL from user_id if it exists (idempotent via DO block)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE jobs ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jobs_status_check' AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_status_check
      CHECK (status IN ('queued','processing','complete','failed'));
  END IF;
END $$;

ALTER TABLE packs
    ADD COLUMN IF NOT EXISTS engine_version TEXT NOT NULL DEFAULT '1.0.0-lite',
    ADD COLUMN IF NOT EXISTS pack_json JSONB NOT NULL DEFAULT '{}';


-- Phase N1: Production Observability Baseline
CREATE TABLE IF NOT EXISTS job_metrics (
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    duration_ms INTEGER NOT NULL,
    llm_timeout BOOLEAN NOT NULL DEFAULT FALSE,
    retrieval_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_metrics_created_at ON job_metrics (created_at);
CREATE INDEX IF NOT EXISTS idx_job_metrics_job_id ON job_metrics (job_id);


-- Phase P1: Cost Controls + Abuse Guard
CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON rate_limits (created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_created_at ON rate_limits (ip, created_at);


-- Phase P2.1: Auth v1 (Invite-only signup + sessions)
-- Add password_hash to users (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Phase P2.2: Per-user daily caps
CREATE TABLE IF NOT EXISTS user_rate_limits (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_rate_limits_created_at ON user_rate_limits (created_at);
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user_created_at ON user_rate_limits (user_id, created_at);
