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
