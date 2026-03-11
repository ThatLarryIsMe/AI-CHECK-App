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

- localStorage-based verification history (key: `factward_history`, max 10 entries) displayed as sidebar on `/verify`
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
- Admin health route requires `x-factward-key` header via `requireBetaKey()`. Returns 401 if key invalid or missing.
- All aggregation metrics are 0-safe: returns zeroes if no job_metrics rows exist.
- Decision: metrics stored in separate `job_metrics` table (not on jobs) to allow append-only observability without touching the core jobs schema.


## Phase N2 — Versioning Discipline (v0.3.1)
- Created `version.ts` at repo root as single source of truth: `export const VERSION = "0.3.1"`.
- All version references now import `{ VERSION }` from `@/../../version`. No other hardcoded version strings remain.
- Updated `apps/web/app/page.tsx` footer: replaced `"v0.3.0-beta"` literal with `v{VERSION}`.
- Updated `apps/web/app/api/admin/health/route.ts`: added `version: VERSION` as first field in JSON response.
- Updated `apps/web/app/api/packs/[id]/export.md/route.ts`: prepended `**Factward Version:** ${VERSION}` and `**Generated At:** ${now}` header block to exported markdown.
- Decision: `version.ts` placed at monorepo root (not inside `apps/web`) so both the web app and any future packages can import from it without circular deps.
- Tagged release `v0.3.1` and published GitHub Release summarizing Phase M stabilization and N1 observability baseline.
- 
## Phase N3 — Access Gate Hardening (v0.3.2)
- Replaced string equality in `requireBetaKey()` with `timingSafeEqual` from Node `crypto` module — prevents timing-based key enumeration attacks.
- Added explicit length-mismatch guard: runs a dummy `timingSafeEqual(aBuf, aBuf)` before returning `false` to prevent length leakage.
- Gate is header-only: `x-factward-key` header is the sole accepted credential path. Query param key support is intentionally absent to prevent key leakage in server logs, proxy headers, and access logs.
- `requireBetaKey()` returns typed `{ ok: true } | { ok: false; reason: string }` — callers receive structured rejection reason.
- Decision: constant-time comparison is mandatory for any secret comparison in production; standard `===` is vulnerable to timing side-channels.
- Bumped `VERSION` to `0.3.2` to reflect hardened gate release.


## Phase N4 — README Hardening (v0.3.2)
- Removed stale `ENGINE_VERSION` from environment variables table — version is now managed via `version.ts` at repo root.
- Added `BETA_ACCESS_KEY` to environment variables table (was missing; required since Phase K).
- Added `BRAVE_API_KEY` (optional) to environment variables table.
- Converted env vars section from bullet list to table format for clarity.
- Updated architecture diagram to include `job_metrics` in Postgres table list and Brave Search retrieval layer.
- Added N3 guardrails to Guardrails section: header-only access gate and constant-time comparison.
- Fixed smoke test step: was `Open /verify?key=...` (query param) — corrected to header-only instruction.
- Updated Roadmap table to reflect all completed phases (J through N4) and mark Phase O as next.
- Added `**v0.3.2**` version marker to README header.
- Decision: README must be updated at end of each Phase N cycle to stay current with prod state.


## Phase P1 — Cost Controls + Abuse Guard
- Add daily cost ceilings (25/IP, 500 global) to protect LLM and retrieval spend.
- Added `rate_limits` table to `infra/db/schema.sql`: columns `id SERIAL`, `ip TEXT`, `created_at TIMESTAMPTZ`; indexed on `created_at` and `(ip, created_at)` for query performance.
- Per-IP daily limit: 25 verifications per IP per 24-hour rolling window; returns 429 `{ error: "Daily per-IP limit reached." }` when exceeded.
- Global daily limit: 500 verifications total per 24-hour rolling window; returns 429 `{ error: "Daily system capacity reached. Try tomorrow." }` when exceeded.
- Each allowed request INSERTs a row into `rate_limits` before job creation — count is authoritative and durable.
- Rate-limited attempts logged as `{ level: "warn", event: "rate_limited", ip }` structured JSON.
- `GET /api/admin/health` now returns `rateLimitedToday` — count of rows in `rate_limits` created since UTC midnight.
- Existing per-minute in-memory rate limiter (10/min/IP) unchanged and still fires first.
- Normal verification flow is unaffected when limits are not exceeded.


## Phase P2.1 - Session Auth (Auth v1)
- Added `password_hash` column to `users` and new `sessions` table to `infra/db/schema.sql`.
- Created `@/lib/auth`: `scrypt` password helpers (no external deps) + session cookie read/write utilities.
- Cookie name: `pm_session`; 14-day expiry; `HttpOnly`, `SameSite=lax`, `Secure` in production.
- `POST /api/auth/signup`: create user with hashed password + auto-login session.
- `POST /api/auth/login`: verify credentials + set session cookie.
- `POST /api/auth/logout`: clear session cookie.
- `GET /api/verify` now requires valid session via `getUserFromRequest()`; stores `userId` on job row.
- `createJob()` updated to accept optional `userId`; `jobs.user_id` is populated on every verify.
- `/app/signup` and `/app/login` pages added.
- `/app/verify/page.tsx`: server-side `requireBetaKey` removed; gate is now client-side only.

## Phase P2.2 - Ownership + Per-user Caps + Remove Beta-Key UX
- `user_rate_limits` table added to `infra/db/schema.sql`: `id SERIAL`, `user_id UUID FK`, `created_at TIMESTAMPTZ`; indexed on `created_at` and `(user_id, created_at)`.
- `getJob()` updated to return `userId` field (was missing from SELECT).
- `getPackForUser(packId, userId)` added to `jobs-db.ts`: joins `packs` to `jobs` and enforces `jobs.user_id = userId`; returns null on mismatch.
- `GET /api/jobs/[id]`: now requires session; returns 404 if job not found or user_id does not match current user (no 403, avoids leaking existence).
- `GET /api/packs/[id]`: now requires session; uses `getPackForUser` - returns 404 if pack not found or belongs to a different user.
- `POST /api/verify`: per-user daily cap at 50 verifications/24h/user via `user_rate_limits` table; returns 429 `{ error: "Daily user limit reached." }` when exceeded.
- `verify-client.tsx`: `betaKey` prop removed; `x-factward-key` header no longer sent from UI. On 401, client redirects to `/login`.
- `/app/verify/page.tsx`: server-side session gate via `cookies()` + `sessions` table query. Unauthenticated users are redirected to `/login`. `betaKey` prop fully removed.
- `docs/beta-ops.md`: rewritten for P2.2; end-user flow is now signup to login to `/verify`. `x-factward-key` is admin-only.
- Decision: return 404 (not 403) on ownership mismatch to avoid leaking resource existence.
- 
## Phase P3.1 - Stripe Subscriptions v1 (Pro plan + webhook + plan-aware caps)

- Stripe SDK initialized server-side in `apps/web/lib/stripe.ts`; exported as singleton `stripe`. Never imported client-side.
- - `getPlanFromSubscription(subscription)`: maps Stripe price ID to `"pro"` | `"free"` via `STRIPE_PRICE_ID_PRO` env var.
  - - `mapSubscriptionStatus(status)`: maps Stripe subscription status to internal `plan_status` enum.
    - - `infra/db/schema.sql`: 5 new columns on `users` — `stripe_customer_id TEXT`, `stripe_subscription_id TEXT`, `plan TEXT DEFAULT 'free'`, `plan_status TEXT DEFAULT 'inactive'`, `current_period_end TIMESTAMPTZ`. All idempotent `ADD COLUMN IF NOT EXISTS`.
      - - `POST /api/billing/checkout`: requires session; creates Stripe customer if missing; creates checkout session for `STRIPE_PRICE_ID_PRO`; returns `{ url }`. Success → `/account?success=1`, cancel → `/account?canceled=1`.
        - - `POST /api/billing/portal`: requires session + existing `stripe_customer_id`; creates Stripe billing portal session; returns `{ url }`.
          - - `POST /api/stripe/webhook`: verifies `stripe-signature` header; handles `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Always returns 200 unless signature invalid (Stripe retry safety). Updates `users` table on every event.
            - - `/api/verify` plan-aware gating: `checkUserDailyLimit()` now fetches `plan` + `plan_status` from `users`; limit = 200 if `plan_status === "active" && plan === "pro"`, else 10. IP/global limits unchanged. Admin routes untouched.
              - - `/account` server component: reads session cookie; queries `users` for email, plan, plan_status, current_period_end; shows plan badge; conditionally renders Upgrade or Manage Billing button; redirects to `/signin` if unauthenticated.
                - - Decision: webhook always returns 200 on handler errors (only 400 on bad signature) to prevent Stripe from disabling the endpoint on transient DB errors.
                  - - Decision: free cap reduced from 50 to 10 to encourage upgrade. Pro cap set to 200.
                    - - Required env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `NEXT_PUBLIC_APP_URL`.
- Decision: `DAILY_USER_LIMIT = 50` hardcoded for now; will move to env var in a future phase.
- Decision: IP limits (25/IP/day, 500 global/day) remain alongside user limits for defense-in-depth.


## Phase P4 — Auth Navigation + Product Clarity + Upgrade UX

- `layout.tsx`: Auth-aware global nav reads `pm_session` cookie server-side; joins `sessions` + `users` to determine user and plan.
- Unauthenticated nav: Verify, Trust, Login, Sign Up (primary).
- - Authenticated nav: Verify, Trust, Account, Logout (POST `/api/auth/logout`), Upgrade button if plan is free.
  - - Admin link removed from nav entirely.
    - - `apps/web/app/page.tsx`: Home page rewritten with plain-English copy — headline "Turn Any Claim Into a Verification Report", subhead describes paste→extract→evaluate→evidence flow. CTAs: "Start Verifying" → `/verify`, "See How It Works" → `/trust`. Waitlist section replaced with "Invite-only beta" + "Create an account" → `/signup`.
      - - `apps/web/app/verify/verify-client.tsx`: Added onboarding blurb (Supported/Mixed/Unsupported label meanings, one-liner on results saving). Added plan-aware usage note (Free: 10/day, Pro: 200/day) with "Upgrade in Account" link for free users. `plan` and `planStatus` props added.
        - - `apps/web/app/verify/page.tsx`: Server component now queries `plan` + `plan_status` from `users` via session join and passes them to `VerifyClient`.
          - - `apps/web/app/account/page.tsx`: Redirect fixed from `/signin` to `/login`. Added logout button (POST `/api/auth/logout`). Added "Usage today: X / limit" display with progress bar — queries `user_rate_limits` in last 24h.
            - - `docs/beta-ops.md`: Removed all waitlist references; updated section 1 to point users to `/signup` with invite code; updated section 6 to reflect plan-aware limits (free 10, pro 200).
              - - Decision: nav upgrade button links to `/account` (not a direct checkout trigger) to keep the nav action safe and reversible.
                - - Decision: `getUsageToday()` is a separate async function (not inlined) so it can be independently tested and replaced with a cached query later.
