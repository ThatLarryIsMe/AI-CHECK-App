# Changelog

All notable changes to ProofMode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- N1: `job_metrics` table migration and observability instrumentation on verify route
- N2: `/api/version` endpoint exposing `ENGINE_VERSION`, engine name, and commit SHA
- N3: Access gate hardening (pending)

## [1.0.0-lite] - 2025-01-01

### Added
- Initial ProofMode engine: extract + classify claims via gpt-4o-mini
- Postgres persistence: jobs, packs, waitlist tables
- Beta access gate via `BETA_ACCESS_KEY` header
- Rate limiting (10 req/min/IP) on `/api/verify`
- Vercel deployment with Next.js 14
- Monorepo structure with `apps/web` and `packages/core`
