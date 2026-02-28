-- Phase N1: Production Observability Baseline
-- Run this migration in your Neon SQL editor after schema.sql

CREATE TABLE IF NOT EXISTS job_metrics (
  job_id        UUID         NOT NULL,
  duration_ms   INTEGER      NOT NULL,
  llm_timeout   BOOLEAN      NOT NULL DEFAULT FALSE,
  retrieval_used BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_metrics_created_at ON job_metrics (created_at);
