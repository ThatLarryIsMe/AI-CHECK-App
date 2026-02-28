# Decisions Log

- Initial monorepo bootstrap
- Phase B: mock verify engine + API routes + UI

# Phase C — LLM-only Verification Engine (v1-lite)
- Replaced mock engine with OpenAI orchestration layer
- Model: gpt-4o-mini, temperature: 0, strict JSON mode
- Conservative classification default: not_enough_info when confidence is low
- No retrieval layer in v1-lite; evidence array is always empty
- Per-claim classification via classifyClaim() with confidence score 0-1
- Claim extraction via extractClaims() returning 1-5 atomic factual claims
- All LLM outputs validated with Zod before use
- EvidencePack validated against core schema before storage/return
- engineVersion field added to EvidencePackSchema (was missing, caused Zod parse failure)
- confidence field on ClaimSchema made required (was optional, engine always provides it)
- runMockEngine alias retained for backwards compat but points to real engine
- Errors mark job as failed with descriptive message


## Phase D — Hardening Layer
- Added LLM timeout (AbortController, 15s max) — prevents infinite hangs on OpenAI calls
- Error type: LLM_TIMEOUT thrown on abort, structured for downstream handling
- Added input length guard (5,000 character max) before any LLM calls — prevents runaway token costs
- Error type: INPUT_TOO_LONG with descriptive message and character count
- Per-claim failure isolation: classifyClaim() errors caught individually; failed claims default to not_enough_info with confidence 0; pack always completes unless extraction itself fails
- Added in-memory rate limiter on POST /api/verify: 10 requests per IP per 60 seconds; returns 429 with structured message
- Added structured JSON logging (console.log/warn/error) for: verification_complete, claim_classification_failed, job_completed, job_failed, rate_limit_exceeded
- Log format: { level, event, jobId, ...context } — machine-readable, ready for log aggregation
- No external dependencies added; all hardening is pure in-process logic


## Phase E — Conversion Layer
- / becomes a public landing page: hero, 3-step how-it-works, waitlist email form
- /verify stays for internal/demo use; linked from landing page as "Try the demo"
- Added POST /api/waitlist route: in-memory store, email validation, idempotent (201 on first, 200 on repeat)
- Added GET /api/waitlist route: returns count only (no PII exposed)
- Waitlist persistence deferred to Phase F (DB wiring)
- Added GET /api/packs/:id/export.md route: returns text/markdown with Content-Disposition attachment
- Export format: pack header (id, engineVersion, created_at), claims with classification + confidence, evidence placeholder, disclaimer
- Export button added to /packs/[id] page (client-side navigation to export route)
- Chose server-side route over client-side Blob: stable formatting, extensible to PDF later


## Phase F1 — Persist Waitlist in Postgres
- DB: Managed Postgres (Neon recommended); single DATABASE_URL connection string
- ORM: None — direct SQL via pg Pool (consistent with project constraints)
- Migration: waitlist_signups table added to infra/db/schema.sql (append-only schema)
- waitlist_signups: id UUID (gen_random_uuid()), email TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ
- POST /api/waitlist: INSERT ON CONFLICT DO NOTHING — idempotent (201 new, 200 existing)
- GET /api/waitlist: returns { count } only — no PII exposed
- db.ts helper: Pool with SSL in production, no SSL in development
- DATABASE_URL added to .env.example with placeholder and instructions
- In-memory waitlist store (Phase E) fully replaced; no backwards compat needed
- Phase F2 (jobs/packs persistence) deferred — requires same DATABASE_URL, will reuse db.ts helper

## Phase G1 — Conversion Polish

- localStorage-based verification history (key: `proofmode_history`, max 10 entries) displayed as sidebar on `/verify`
- History entries store `{ packId, snippet, ts }`; links resolve to `/packs/${packId}` after polling job for packId
- Export v2: server-side route upgraded with Summary table (total/supported/mixed/unsupported/avgConfidence), Method & Limitations block, Disclaimer
- Error UX upgraded to bordered error card with dismiss button; pack-load errors include Retry button
- Root `decisions.md` removed; `docs/decisions.md` is the single source of truth (append-only)

## Phase I — Positioning & Launch Readiness
- Repositioned landing copy around structured verification for professional knowledge users
- Updated homepage messaging to emphasize conservative claim assessment and shareable reporting outputs
- Added `/trust` page with sober definitions for Supported/Mixed/Unsupported and explicit LLM-only limitation disclosure
- Documented data retention behavior: verification jobs and evidence packs are stored in the database
- Added forward-looking retrieval statement: web retrieval layer planned in a future release
- Rewrote root README with investor-ready product summary, architecture diagram, stack, guardrails, env vars, setup, schema, and roadmap
- Added footer metadata on landing page with version `v0.3.0-beta` and trust page link

## Phase J — Controlled Retrieval Layer (Brave Search)
- Added an optional Brave Search retrieval layer to attach real evidence snippets to each extracted claim.
- Retrieval is fail-open: if Brave retrieval fails (or API key is absent), verification continues in LLM-only mode with empty evidence for that claim.
- Retrieval limits: max 3 results per claim, claim extraction remains capped at max 5 claims.
- Timeout guard: each Brave API call has a hard 5-second timeout.
- BRAVE_API_KEY is optional and server-only; retrieval is disabled when not configured.

## Phase K — Controlled Public Beta
- Added invite-key access gate via `BETA_ACCESS_KEY` and shared `requireBetaKey()` helper in `apps/web/lib/access.ts`.
- `/` remains public; `/verify` UI now shows an invite-only beta message when key is missing or invalid.
- `POST /api/verify` is hard-gated before job creation/engine execution; unauthorized requests return 403 with standard invite-only message.
- Added protected `GET /api/admin/stats` route for aggregate metrics only (`total_jobs`, `total_packs`, `total_waitlist_signups`, `last_24h_jobs`, `avg_claims_per_pack`) with no PII.
- Expanded structured telemetry in verify flow and engine logs with: `jobId`, `totalDurationMs`, `llmDurationMs`, `retrievalDurationMs`, `claimsCount`, `evidenceCount`, `engineVersion`, `inputLength`, and `errorType`.
- Updated deploy docs and environment examples to include `BETA_ACCESS_KEY` and Vercel deployment + smoke test checklist.


## Phase N1 — Production Observability Baseline
- Added `job_metrics` table to `infra/db/schema.sql` with FK `REFERENCES jobs(id) ON DELETE CASCADE`, columns: `job_id`, `duration_ms`, `llm_timeout`, `retrieval_used`, `created_at`.
- Added idempotent `CREATE INDEX IF NOT EXISTS` on `job_id` and `created_at` for query performance.
- Instrumented verify route: captures `startTime`, computes `duration_ms`, sets `llm_timeout = true` on timeout errors, `retrieval_used = true` when `evidenceCount > 0`.
- Metrics insert is wrapped in explicit `try/catch` — a failure logs `job_metrics_insert_failed` event and does NOT propagate; verification flow is unaffected.
- Created `GET /api/admin/health` route returning `{totalJobsToday, avgDurationMs, timeoutRate, retrievalRate}` from `job_metrics`.
- Admin health route requires `x-proofmode-key` header via `requireBetaKey()`. Returns 401 if key invalid or missing.
- All aggregation metrics are 0-safe: returns zeroes if no job_metrics rows exist.
- Decision: metrics stored in separate `job_metrics` table (not on jobs) to allow append-only observability without touching the core jobs schema.


## Phase N2 — Versioning Discipline (v0.3.1)
- Created `version.ts` at repo root as single source of truth: `export const VERSION = "0.3.1"`.
- All version references now import `{ VERSION }` from `@/../../version`. No other hardcoded version strings remain.
- Updated `apps/web/app/page.tsx` footer: replaced `"v0.3.0-beta"` literal with `v{VERSION}`.
- Updated `apps/web/app/api/admin/health/route.ts`: added `version: VERSION` as first field in JSON response.
- Updated `apps/web/app/api/packs/[id]/export.md/route.ts`: prepended `**ProofMode Version:** ${VERSION}` and `**Generated At:** ${now}` header block to exported markdown.
- Decision: `version.ts` placed at monorepo root (not inside `apps/web`) so both the web app and any future packages can import from it without circular deps.
- Tagged release `v0.3.1` and published GitHub Release summarizing Phase M stabilization and N1 observability baseline.
- 
## Phase N3 — Access Gate Hardening (v0.3.2)
- Replaced string equality in `requireBetaKey()` with `timingSafeEqual` from Node `crypto` module — prevents timing-based key enumeration attacks.
- Added explicit length-mismatch guard: runs a dummy `timingSafeEqual(aBuf, aBuf)` before returning `false` to prevent length leakage.
- Gate is header-only: `x-proofmode-key` header is the sole accepted credential path. Query param key support is intentionally absent to prevent key leakage in server logs, proxy headers, and access logs.
- `requireBetaKey()` returns typed `{ ok: true } | { ok: false; reason: string }` — callers receive structured rejection reason.
- Decision: constant-time comparison is mandatory for any secret comparison in production; standard `===` is vulnerable to timing side-channels.
- Bumped `VERSION` to `0.3.2` to reflect hardened gate release.
