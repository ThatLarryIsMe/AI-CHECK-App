# Changelog

All notable changes to ProofMode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.3.2] - 2026-02-28

### Added

- N1: `job_metrics` table migration and observability instrumentation on verify route
- N2: `version.ts` single source of truth; version surfaced in UI footer, admin health response, and markdown export header
- N3: Access gate hardening — constant-time key comparison via `timingSafeEqual`, header-only gate, structured rejection reason

## [1.0.0-lite] - 2025-01-01

### Added

- Initial ProofMode engine: extract + classify claims via gpt-4o-mini
- Postgres persistence: jobs, packs, waitlist tables
- Beta access gate via `BETA_ACCESS_KEY` header
- Rate limiting (10 req/min/IP) on `/api/verify`
- Vercel deployment with Next.js 14
- Monorepo structure with `apps/web` and `packages/core`
