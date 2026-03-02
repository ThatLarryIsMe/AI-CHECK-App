# ProofMode (AI-CHECK-App) — Production Readiness Audit

**Auditor:** Staff Engineer / Product Architect Review
**Date:** 2026-03-01
**Version:** 0.3.2
**Target:** Small paid beta in 30 days

---

## 1. Production Readiness Score

### Score: 38 / 100

**Justification:**

| Category | Weight | Score | Notes |
|---|---|---|---|
| Auth & Session Security | 15% | 7/10 | Solid scrypt + timing-safe, but no brute-force protection, sessions unhashed in DB |
| Billing Correctness | 20% | 3/10 | Webhook signature verified, but account page billing forms are broken (return JSON instead of redirecting), checkout not idempotent, no duplicate-subscription guard |
| Data Integrity | 15% | 4/10 | Schema/runtime type mismatches cause silent failures; job_metrics INSERT always fails due to missing UNIQUE constraint |
| Rate Limiting & Cost Control | 10% | 5/10 | Good layered approach but race conditions exist, in-memory limiter doesn't survive serverless cold starts |
| Observability | 10% | 2/10 | Structured logs exist but job_metrics is silently broken; no alerting |
| UX Completeness | 10% | 4/10 | Core flows work but version mismatches, stale copy, missing pricing page, broken export |
| CI/Build Integrity | 5% | 2/10 | No lint, no typecheck, no tests in CI; TS errors suppressed |
| Serverless Compatibility | 10% | 2/10 | Fire-and-forget async in verify route may be killed on Vercel |
| Architecture | 5% | 5/10 | Clean separation, good monorepo structure, but significant coupling and duplication |

---

## 2. Categorized Issue List

### RED CRITICAL — Security, Data Loss, Billing Correctness, Auth Flaws

#### C1. `job_metrics` INSERT silently fails — observability is broken
- **File:** `apps/web/lib/jobs-db.ts:67-72`
- **Issue:** `ON CONFLICT (job_id) DO NOTHING` requires a UNIQUE constraint on `job_id`, but `infra/db/schema.sql:98-99` only creates a regular (non-unique) index. PostgreSQL will throw: `there is no unique or exclusion constraint matching the ON CONFLICT specification`. The error is caught and silently swallowed in `apps/web/app/api/verify/route.ts:193-204`.
- **Impact:** Zero job metrics are being recorded. The admin health dashboard shows zeros. The entire observability layer is non-functional.
- **Fix:** Add `PRIMARY KEY (job_id)` or `UNIQUE (job_id)` to `job_metrics` table. DB migration required.

#### C2. Fire-and-forget verification may be killed on Vercel
- **File:** `apps/web/app/api/verify/route.ts:177-262`
- **Issue:** The async verification runs via `void (async () => { ... })()` after the response is sent. On Vercel serverless functions, execution may be terminated after the response completes. The LLM call alone takes up to 15 seconds; with retrieval, jobs may take 20+ seconds.
- **Impact:** Jobs may be permanently stuck in `queued` or `processing` state. Users see "Loading..." forever.
- **Fix:** Use `waitUntil()` from `next/server` (Next.js 14.1+) or refactor to process synchronously and return the pack directly.

#### C3. Account page billing forms return raw JSON instead of redirecting
- **Files:** `apps/web/app/account/page.tsx:149-166` (checkout form), `170-188` (portal form)
- **Issue:** These are HTML `<form method="POST">` in a server component posting to API routes that return JSON (`{ url: "..." }`). The browser navigates to the API route and displays raw JSON. The user never reaches Stripe checkout.
- **Impact:** Billing upgrade flow is non-functional from the account page. Users cannot subscribe to Pro.
- **Fix:** Either convert to client component with `fetch()` + `window.location.href = data.url`, or have the API routes return 302 redirects.

#### C4. Job status enum mismatch between DB and client
- **DB schema (`infra/db/schema.sql:11`):** `CHECK (status IN ('queued','processing','complete','failed'))`
- **Core Zod schema (`packages/core/src/index.ts:18`):** `z.enum(["queued", "running", "completed", "failed"])`
- **Jobs page client (`apps/web/app/jobs/[id]/page.tsx:8`):** expects `"completed"` and `"failed"`
- **Actual API returns:** `"complete"` (not `"completed"`) and `"processing"` (not `"running"`)
- **Impact:** The `/jobs/[id]` page never stops polling because it checks for `"completed"` but receives `"complete"`. Infinite polling loop.
- **Fix:** Align the DB status values with the client expectations, or add a mapping layer in the API.

#### C5. Markdown export has no auth and ignores real evidence
- **File:** `apps/web/app/api/packs/[id]/export.md/route.ts`
- **Issue 1:** Uses `getPack()` instead of `getPackForUser()` — no ownership check. Anyone with a pack UUID can export it.
- **Issue 2:** Hardcodes "No evidence retrieved (LLM-only mode)" on line 69, ignoring actual evidence from the pack's `evidence` array.
- **Impact:** Data leakage via unauthenticated access. Exported reports are incomplete.
- **Fix:** Add auth + ownership check. Iterate `pack.evidence` in the export template.

#### C6. Invite code comparison is not timing-safe
- **File:** `apps/web/app/api/auth/signup/route.ts:47`
- **Issue:** `inviteCode !== expectedCode` uses standard string comparison, leaking information about the invite code via timing side-channels.
- **Impact:** Low probability but non-zero risk of invite code extraction via repeated timing measurements.
- **Fix:** Use the existing `safeCompare()` from `lib/access.ts`.

#### C7. No brute-force protection on login
- **File:** `apps/web/app/api/auth/login/route.ts`
- **Issue:** No rate limiting, no account lockout, no CAPTCHA. An attacker can make unlimited password guesses.
- **Impact:** Password brute-force attacks against known email addresses.
- **Fix:** Add per-IP rate limiting on the login endpoint (reuse the in-memory limiter pattern or a DB-backed counter).

#### C8. Session tokens stored in plaintext
- **File:** `apps/web/lib/auth.ts:47`, `infra/db/schema.sql:118`
- **Issue:** Session tokens are stored as-is in the `sessions` table. If the database is compromised (e.g., Neon backup leak), all active sessions are immediately usable.
- **Impact:** Database compromise = full account takeover for all active sessions.
- **Fix:** Store `SHA-256(token)` in DB; compare hashes on lookup.

---

### ORANGE HIGH — Scalability, Correctness Edge Cases

#### H1. Rate limit check-then-insert race condition
- **File:** `apps/web/app/api/verify/route.ts:86-95` (check) vs `160-165` (insert)
- **Issue:** The count check and the rate limit row insert are separate queries with no transaction. Two concurrent requests can both pass the check before either inserts.
- **Impact:** Users can exceed their daily limit by 1-2 verifications per race window. Pro users could theoretically exceed 200/day.
- **Fix:** Use `INSERT ... SELECT ... WHERE (SELECT COUNT(*) ...) < limit` as a single atomic query, or use `SELECT ... FOR UPDATE` in a transaction.

#### H2. In-memory rate limiter doesn't survive serverless
- **File:** `apps/web/app/api/verify/route.ts:13-36`
- **Issue:** `rateLimitMap` is a module-level `Map`. In serverless (Vercel), each cold start creates a fresh map. Multiple concurrent instances have separate maps.
- **Impact:** The 10-req/min IP limiter is effectively non-functional in production. Abuse can bypass it trivially.
- **Fix:** Move to DB-backed or Redis-backed rate limiting, or accept this as defense-in-depth behind the DB-backed daily limits.

#### H3. Verify client doesn't properly poll for job completion
- **File:** `apps/web/app/verify/verify-client.tsx:69-77`
- **Issue:** After submitting, the client polls the job status exactly once, then immediately navigates to `/packs/${packId}`. If the job hasn't completed (likely — LLM takes seconds), `packId` is null and the client navigates to `/packs/${jobId}`, which 404s.
- **Impact:** Users frequently see "Pack not found" errors after submitting verifications.
- **Fix:** Implement proper polling loop (like `/jobs/[id]/page.tsx` does) or navigate to `/jobs/${jobId}` and let that page handle polling.

#### H4. No expired session cleanup
- **File:** `infra/db/schema.sql:117-126`
- **Issue:** Expired sessions are never deleted. They accumulate forever.
- **Impact:** `sessions` table bloat; slower session lookups over time.
- **Fix:** Add a scheduled job or a DB trigger to purge `WHERE expires_at < NOW()`. Or add cleanup to the login flow.

#### H5. No rate_limits / user_rate_limits table cleanup
- **Files:** `infra/db/schema.sql:102-136`
- **Issue:** Rate limit rows are never deleted. Both tables grow by one row per verification, forever.
- **Impact:** Table bloat. The `COUNT(*)` queries in rate limiting will slow down even with indexes.
- **Fix:** Add a daily cron to `DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '48 hours'`. Same for `user_rate_limits`.

#### H6. Checkout is not idempotent — no duplicate subscription guard
- **File:** `apps/web/app/api/billing/checkout/route.ts`
- **Issue:** A Pro user can initiate another checkout session. There's no check for an existing active subscription. Users could end up with multiple Stripe subscriptions.
- **Impact:** Double-billing. Webhook would update to latest subscription, masking the duplicate.
- **Fix:** Check `plan === 'pro' && plan_status === 'active'` before creating checkout session.

#### H7. `pool` is a default export but imported as named export everywhere
- **File:** `apps/web/lib/db.ts:25` — `export default pool`
- **All consumers:** `import { pool } from "@/lib/db"` (named import)
- **Issue:** This works due to webpack module interop but is incorrect ESM. TypeScript would flag it, but `ignoreBuildErrors: true` suppresses the error.
- **Impact:** Would break if bundler behavior changes or if strict ESM is enforced.
- **Fix:** Change to `export { pool }` (named export) alongside the existing `export default pool`.

---

### YELLOW MEDIUM — DX, Reliability, Logging Gaps

#### M1. TypeScript and ESLint errors suppressed at build
- **File:** `apps/web/next.config.mjs:5-8`
- **Issue:** `typescript: { ignoreBuildErrors: true }` and `eslint: { ignoreDuringBuilds: true }` hide all type and lint errors.
- **Impact:** Type errors silently ship to production. The `pool` import issue (H7), status enum mismatch (C4), and potentially other bugs are masked.
- **Fix:** Fix all type errors and remove these flags. Add `typecheck` step to CI.

#### M2. CI pipeline has no lint, typecheck, or test steps
- **File:** `.github/workflows/ci.yml`
- **Issue:** CI only runs `npm install` and `npm run build`. No linting, no type checking, no tests.
- **Impact:** Regressions ship uncaught. The build succeeds even with type errors (M1).
- **Fix:** Add `npm run lint`, `npm run typecheck`, and test steps.

#### M3. Duplicated session-reading logic across 4 files
- **Files:** `apps/web/lib/auth.ts:63-80`, `apps/web/app/layout.tsx:20-42`, `apps/web/app/account/page.tsx:15-26`, `apps/web/app/verify/page.tsx:8-19`
- **Issue:** The same "read cookie → query sessions JOIN users → return user" pattern is copy-pasted in 4 places with slight variations.
- **Impact:** Bug fixes must be applied in 4 places. Different places return different fields.
- **Fix:** Consolidate into a single `getSessionUser(fields?: string[])` function in `lib/auth.ts`.

#### M4. Hardcoded version "0.1.0" in two client components
- **Files:** `apps/web/app/packs/[id]/page.tsx:6` — `const VERSION = "0.1.0"`
- **Files:** `apps/web/app/admin/page.tsx:4` — `const VERSION = "0.1.0"`
- **Correct version:** `version.ts` — `export const VERSION = "0.3.2"`
- **Impact:** Copy Summary and admin report show wrong version. Confusing for users and operators.
- **Fix:** Import from `version.ts` (may need to convert to client-compatible import or pass as prop from server component).

#### M5. Trust page claims retrieval is not yet built
- **File:** `apps/web/app/trust/page.tsx:49`
- **Issue:** Says "A web retrieval layer is planned for a future release" but Brave Search retrieval is already implemented in `lib/retrieval.ts`.
- **Impact:** Misleading users about product capabilities.
- **Fix:** Update trust page copy to reflect current retrieval capabilities.

#### M6. Pricing placeholder "$X/month" on account page
- **File:** `apps/web/app/account/page.tsx:164`
- **Issue:** Button text reads "Upgrade to Pro — $X/month" — literal placeholder.
- **Impact:** Users see unprofessional placeholder text.
- **Fix:** Replace with actual price or fetch from Stripe.

#### M7. `rejectUnauthorized: false` in production SSL
- **File:** `apps/web/lib/db.ts:9`
- **Issue:** Disables TLS certificate verification for DB connections in production.
- **Impact:** Vulnerable to MITM attacks on the database connection.
- **Fix:** Use the Neon root certificate or set `rejectUnauthorized: true` with proper CA configuration.

#### M8. Admin health endpoint computes avg/timeout/retrieval rates over ALL TIME
- **File:** `apps/web/app/api/admin/health/route.ts:26-33`
- **Issue:** The `AVG(duration_ms)`, `timeout_count`, and `retrieval_count` are computed over the entire `job_metrics` table, not just today. Only `total_jobs_today` is filtered. The rates shown in the admin panel are lifetime rates, not daily.
- **Impact:** As the app scales, today's metrics are diluted by historical data.
- **Fix:** Add `WHERE created_at >= $1` to the aggregate filters.

---

### GREEN LOW — Polish

#### L1. No pricing page
- **Issue:** There's no `/pricing` route. Users must navigate to `/account` to see upgrade options. The landing page doesn't mention pricing.
- **Fix:** Add a `/pricing` page with Free vs Pro comparison.

#### L2. No loading/Suspense boundaries
- **Issue:** No `loading.tsx` files exist in any route segment. No `<Suspense>` boundaries. Server components that do DB queries (layout, account, verify) have no loading states.
- **Fix:** Add `loading.tsx` to `/verify`, `/account`, and `/packs/[id]`.

#### L3. No `error.tsx` error boundaries
- **Issue:** No error boundaries exist. A DB connection failure in the layout would crash the entire app with a generic Next.js error.
- **Fix:** Add `error.tsx` to key route segments.

#### L4. No favicon or OpenGraph metadata
- **Issue:** No favicon, no OG image, no Twitter card metadata beyond basic title/description.
- **Fix:** Add to `app/layout.tsx` metadata.

#### L5. Logout form in layout submits to API route
- **File:** `apps/web/app/layout.tsx:101-108`
- **Issue:** `<form action="/api/auth/logout" method="POST">` in the nav. Like the billing forms (C3), this returns JSON `{ ok: true }` instead of redirecting.
- **Impact:** User sees raw JSON after logout instead of being redirected to `/login`.
- **Fix:** Have the logout route return a 302 redirect to `/login`, or use client-side fetch.

---

## 3. Inconsistencies

### Schema vs Runtime Types

| Area | DB/Schema Value | Runtime/Zod Value | Location |
|---|---|---|---|
| Job status "processing" | `'processing'` | `"running"` | `schema.sql:11` vs `core/index.ts:18` |
| Job status "complete" | `'complete'` | `"completed"` | `schema.sql:11` vs `core/index.ts:18` |
| `job_metrics.job_id` | Regular INDEX | `ON CONFLICT (job_id)` requires UNIQUE | `schema.sql:99` vs `jobs-db.ts:70` |
| Claim `confidence` | DB stores 0-1 float | Client sometimes treats as 0-100 | `schema.ts:8` vs `packs/[id]/page.tsx:201-202` |
| `EvidenceSchema.snippet` | Zod field name | Runtime uses `quotedSpan` | `schema.ts:15` vs `engine.ts:118-119` |

### Stripe Plan Logic vs Enforcement

| Check | Location | Logic |
|---|---|---|
| Rate limit check | `verify/route.ts:84-85` | `planStatus === "active" && plan === "pro"` → 200 else 10 |
| Account display | `account/page.tsx:36` | `plan === "pro" && planStatus === "active"` → isPro |
| Nav display | `layout.tsx:50` | `plan === "pro" && planStatus === "active"` → isPro |
| **Missing:** past_due grace period | N/A | A `past_due` Pro user is immediately treated as Free (10/day) |

### Rate Limits — IP vs User

| Limit | Applied When | Interaction |
|---|---|---|
| 10/min/IP (in-memory) | Before auth check | Blocks even authenticated users |
| 25/day/IP (DB) | After auth | A shared IP (office) hits this before per-user limit |
| 500/day global (DB) | After auth | Hard ceiling regardless of Pro status |
| 10/day user (Free) | After IP checks | Could be blocked by IP limit first |
| 200/day user (Pro) | After IP checks | **Bug:** A Pro user on shared IP hits 25/IP/day limit at 25, never reaching 200 |

**Critical finding:** The 25/IP/day limit overrides the 200/day Pro limit for users on shared IPs or VPNs. A Pro user paying for 200/day can only use 25.

### Session Handling and Redirects

| Route | Auth Missing | Behavior |
|---|---|---|
| `/api/verify` | 401 JSON | Client handles correctly |
| `/api/jobs/[id]` | 404 JSON | Masks auth failure as not-found |
| `/api/packs/[id]` | 404 JSON | Masks auth failure as not-found |
| `/api/billing/checkout` | 401 JSON | But form POST shows raw JSON (C3) |
| `/verify` (page) | redirect("/login") | Server-side redirect, correct |
| `/account` (page) | redirect("/login") | Server-side redirect, correct |

---

## 4. Security Vulnerabilities

### ID Enumeration
- **Jobs/Packs:** Protected. Both return 404 for non-owned resources (no distinction between "doesn't exist" and "not yours"). UUIDs are unguessable. **OK.**
- **Export.md:** **VULNERABLE.** No auth check — if you know a pack UUID, you can export it.
- **Waitlist GET:** Returns only count, no PII. **OK.**

### Cookie Flags
- `httpOnly: true` — **OK** (prevents XSS token theft)
- `secure: production only` — **OK**
- `sameSite: "lax"` — **OK** (blocks cross-site POST, allows same-site navigation)
- **Missing:** Session tokens not hashed in DB (C8)

### Webhook Verification Correctness
- Stripe webhook uses `stripe.webhooks.constructEvent()` with raw body and signature header. **Correct.**
- Returns 400 on bad signature, 200 on handler errors. **Correct pattern** (prevents Stripe from disabling endpoint).
- **Gap:** No idempotency key checking. Duplicate webhook deliveries could trigger duplicate DB writes (though UPDATE is idempotent for same data).

### Header Injection
- IP extraction: `x-forwarded-for?.split(",")[0]?.trim()` — stored in `rate_limits.ip`. Not used in HTML output. **Low risk** but IP field has no length limit in schema.
- No user-controlled data is reflected in response headers. **OK.**

### Missing CSRF Protection
- `sameSite: "lax"` on cookies blocks cross-origin POST of session cookies. **Adequate for API routes.**
- HTML form POSTs to API routes (C3, L5) are same-origin, so cookies are sent. Cross-origin forms would not send cookies. **OK.**

### Brute-Force Login
- **VULNERABLE.** No rate limiting on `/api/auth/login`. No account lockout. No CAPTCHA. Unlimited attempts. (C7)

---

## 5. Cost Leak Vectors

### Retrieval calls not gated by plan
- **File:** `apps/web/lib/engine.ts:73-91`
- **Issue:** Both Free and Pro users trigger Brave Search API calls. Free users (10/day) cost the same per-verification as Pro users.
- **Impact:** Acceptable at current scale (max 500 global/day × 5 claims × 1 Brave call = 2,500 Brave API calls/day). But no differentiation means Free users have the same cost profile as Pro.
- **Mitigation:** The 10/day Free limit caps total cost from free users.

### Metrics insert failures
- **File:** `apps/web/app/api/verify/route.ts:193-204`
- **Issue:** Every `insertJobMetrics()` call fails due to missing UNIQUE constraint (C1). The error is caught and logged, consuming DB connection pool resources for a guaranteed-failing query.
- **Impact:** 2 wasted DB queries per verification (success and failure path both try to insert).
- **Fix:** Fix the UNIQUE constraint (C1).

### Rate limit race conditions
- **Issue (H1):** Two concurrent requests can both pass rate limit checks.
- **Impact:** At most 1-2 extra verifications per race window. Each costs ~2 LLM calls + up to 5 Brave calls.
- **Cost at scale:** Negligible for beta, but compounds with user growth.

### Unbounded input before rate limit check
- **File:** `apps/web/app/api/verify/route.ts:167`
- **Issue:** `request.json()` is called after rate limit checks pass and rate limit rows are inserted, but before text validation. If `text` is empty, the rate limit row is already consumed.
- **Impact:** A malicious user can burn rate limit quota by sending empty requests.
- **Fix:** Move body parsing and text validation before rate limit row insertion.

---

## 6. Production Gaps

### Missing DB Indexes
- `users.email` — Has UNIQUE constraint (acts as index). **OK.**
- `users.stripe_customer_id` — **MISSING INDEX.** The webhook handler does `WHERE stripe_customer_id = $1`. Without an index, this is a full table scan on every webhook.
- `sessions.token` — Has index. **OK.**
- `jobs.user_id` — **MISSING INDEX.** The ownership check `WHERE ... j.user_id = $2` has no index.
- `jobs.created_at` — **MISSING INDEX.** Admin stats query `WHERE created_at >= NOW() - INTERVAL '24 hours'` scans all jobs.
- `packs.job_id` — **MISSING INDEX.** The join `FROM packs p JOIN jobs j ON j.id = p.job_id` has no index on the FK.

### Long-Running API Routes
- `/api/verify` — Designed to be async (fire-and-forget), but the async portion may be killed on Vercel (C2).
- `/api/admin/stats` — Runs 5 parallel COUNT queries across jobs, packs, waitlist, and JSONB aggregation. Could be slow with large tables.
- `/api/admin/health` — Full-table aggregation on `job_metrics` (M8).

### Missing Error Boundaries
- No `error.tsx` in any route segment. A DB failure in the root layout crashes the entire app.

### Missing Suspense Boundaries
- No `loading.tsx` files. Server component pages (account, verify) show no loading state during server-side data fetching.

### Build / CI Fragility
- **No tests exist in the repository.** Zero test files found.
- CI only builds — no lint, typecheck, or test steps (M2).
- TypeScript errors suppressed (M1) — anything that compiles ships.
- `pnpm` workspace but CI uses `npm install` (see `vercel.json:3` and `.github/workflows/ci.yml:22`). Potential lockfile mismatch.

---

## 7. Stripe Billing Correctness

### Does subscription deletion correctly downgrade?
**Yes, partially.** The webhook handler for `customer.subscription.deleted` (`apps/web/app/api/stripe/webhook/route.ts:60-67`) sets `plan = 'free'`, `plan_status = 'canceled'`, `stripe_subscription_id = NULL`, `current_period_end = NULL`. The user is immediately treated as Free.

**Gap:** No grace period. If a subscription is canceled mid-billing-period (user paid through month-end), they lose Pro access immediately instead of at period end. Stripe sends `customer.subscription.updated` with `cancel_at_period_end = true` first, then `customer.subscription.deleted` at period end. The `updated` handler would set status based on `subscription.status`, which is still `"active"` until period end. So this actually works correctly IF both events are received. But if only `deleted` fires, access is revoked early.

### What happens if webhook fails?
The handler catches all errors after signature verification and still returns 200 (`apps/web/app/api/stripe/webhook/route.ts:73-77`). This means:
- Stripe won't retry the webhook
- The user's plan won't be updated
- The user stays on their old plan until the next Stripe event triggers an upsert

**Gap:** A single failed `customer.subscription.created` webhook means a paying user stays on Free. No reconciliation mechanism exists.

### Is checkout idempotent?
**No.** There's no check for an existing active subscription before creating a new checkout session (H6). A user can:
1. Click "Upgrade" twice quickly
2. Complete both checkouts
3. End up with two Stripe subscriptions

---

## 8. Observability Gaps

### Are failed jobs recorded?
**In theory, yes.** The verify route calls `markFailed(jobId, message)` in the catch block (`apps/web/app/api/verify/route.ts:228`) and attempts to insert job metrics (`line 230`). **But:**
1. `insertJobMetrics` always fails (C1), so no duration/timeout data is recorded for failures.
2. `markFailed` does work, so the job status is correctly set to `'failed'`.
3. Structured error logs are emitted to console (lines 241-260).

**Net:** Job failures are recorded in the `jobs` table but NOT in `job_metrics`. Duration and timeout data for failures is lost.

### Is there a billing anomaly detection gap?
**Yes, completely.** There is:
- No alert when a webhook fails
- No reconciliation job to compare Stripe subscription state with DB
- No monitoring for users who paid but didn't get Pro access
- No monitoring for revenue changes or churn
- No logging of Stripe webhook event IDs for dedup
- The admin dashboard shows job metrics, not billing metrics

---

## 9. UX Gaps

### Unreachable Routes
- `/jobs/[id]` — Reachable via URL but **never linked to** from the verify flow. `verify-client.tsx` navigates directly to `/packs/${packId}`.

### Dead Navigation Paths
- After logout (layout nav form or account page form), user sees raw JSON `{"ok":true}` instead of being redirected.
- After billing checkout/portal, user sees raw JSON `{"url":"..."}` instead of being redirected.

### Confusing Product Copy
- Trust page says retrieval "is planned" but it's already live.
- Account page says "Upgrade to Pro — $X/month" (literal placeholder).
- Pack export says "LLM-only mode" even when evidence was retrieved.
- Admin page and pack page display version "0.1.0" instead of "0.3.2".

### Missing Pricing Page
- No `/pricing` route. No pricing information on the landing page. Users only discover pricing on the account page (which requires login).

### Missing Features
- No "forgot password" flow.
- No email verification on signup.
- No ability to change password.
- No ability to delete account.

---

## 10. Architectural Debt

### Duplication
1. **Session reading** duplicated in 4 files (M3): `auth.ts`, `layout.tsx`, `account/page.tsx`, `verify/page.tsx`
2. **Plan check logic** (`plan === "pro" && planStatus === "active"`) duplicated in 4 locations
3. **Version constant** defined in 3 places: `version.ts`, `packs/[id]/page.tsx`, `admin/page.tsx`

### Tight Coupling
1. **DB pool import in every file** — every route and page directly imports `pool` and writes raw SQL. No data access layer.
2. **Stripe types in webhook handler** — webhook handler casts `event.data.object` to Stripe types inline.
3. **Rate limit logic embedded in verify route** — 96 lines of rate limiting code in a single API route file.

### Files That Should Be Modularized
1. `apps/web/app/api/verify/route.ts` (265 lines) — Extract rate limiting into `lib/rate-limiter.ts`
2. `apps/web/app/account/page.tsx` (212 lines) — Extract `getAccountUser()` and `getUsageToday()` into shared auth/usage helpers
3. `apps/web/app/packs/[id]/page.tsx` (242 lines) — Extract summary calculation into a shared utility

---

## "Finish the Project" Plan

### Phase X1 — Must Fix Before Public Launch

| # | Issue | Files to Modify | DB Migration | Risk |
|---|---|---|---|---|
| X1.1 | Fix `job_metrics` UNIQUE constraint (C1) | `infra/db/schema.sql`, new migration `002_fix_job_metrics_pk.sql` | **Yes** — `ALTER TABLE job_metrics ADD CONSTRAINT job_metrics_pkey PRIMARY KEY (job_id)` | Low |
| X1.2 | Fix verify route for serverless (C2) | `apps/web/app/api/verify/route.ts` | No | Medium — refactor to sync processing or use `waitUntil()` |
| X1.3 | Fix billing forms (C3) | `apps/web/app/account/page.tsx` | No | Low — convert billing section to client component with fetch |
| X1.4 | Fix job status enum mismatch (C4) | `packages/core/src/index.ts`, `apps/web/app/jobs/[id]/page.tsx` | No | Low — update Zod schema to match DB |
| X1.5 | Fix export.md auth + evidence (C5) | `apps/web/app/api/packs/[id]/export.md/route.ts` | No | Low |
| X1.6 | Add brute-force protection to login (C7) | `apps/web/app/api/auth/login/route.ts` | No | Low |
| X1.7 | Fix version constants (M4) | `apps/web/app/packs/[id]/page.tsx`, `apps/web/app/admin/page.tsx` | No | Low |
| X1.8 | Fix "$X/month" placeholder (M6) | `apps/web/app/account/page.tsx` | No | Low |
| X1.9 | Fix trust page copy (M5) | `apps/web/app/trust/page.tsx` | No | Low |
| X1.10 | Add checkout idempotency guard (H6) | `apps/web/app/api/billing/checkout/route.ts` | No | Low |
| X1.11 | Fix IP limit overriding Pro limit (Section 3) | `apps/web/app/api/verify/route.ts` | No | Low — exempt authenticated Pro users from IP daily limit |
| X1.12 | Add missing DB indexes | New migration `003_add_indexes.sql` | **Yes** | Low |
| X1.13 | Fix `pool` export (H7) | `apps/web/lib/db.ts` | No | Low — add named export |
| X1.14 | Fix logout/nav redirect (L5) | `apps/web/app/api/auth/logout/route.ts` or `layout.tsx` | No | Low |
| X1.15 | Move body parsing before rate limit insert | `apps/web/app/api/verify/route.ts` | No | Low |

**Estimated effort:** 2-3 engineering days
**Migration SQL for X1.1:**
```sql
-- 002_fix_job_metrics_pk.sql
ALTER TABLE job_metrics ADD CONSTRAINT job_metrics_pkey PRIMARY KEY (job_id);
```

**Migration SQL for X1.12:**
```sql
-- 003_add_indexes.sql
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at);
CREATE INDEX IF NOT EXISTS idx_packs_job_id ON packs (job_id);
```

### Phase X2 — Required Before Scaling Users

| # | Issue | Files to Modify | DB Migration | Risk |
|---|---|---|---|---|
| X2.1 | Enable TypeScript strict checking (M1) | `apps/web/next.config.mjs`, fix all type errors | No | Medium — may surface many errors |
| X2.2 | Add typecheck + lint to CI (M2) | `.github/workflows/ci.yml` | No | Low |
| X2.3 | Consolidate session-reading logic (M3) | `apps/web/lib/auth.ts`, all consuming files | No | Low |
| X2.4 | Add DB-backed rate limiting for login | New file `lib/login-limiter.ts`, `apps/web/app/api/auth/login/route.ts` | **Yes** — new `login_attempts` table | Low |
| X2.5 | Hash session tokens in DB (C8) | `apps/web/lib/auth.ts`, migration to rehash existing tokens | **Yes** | Medium — requires token rotation strategy |
| X2.6 | Add expired session cleanup | New migration or cron job | **Yes** if trigger-based | Low |
| X2.7 | Add rate_limits table cleanup | Cron job or Neon scheduled task | No (operational) | Low |
| X2.8 | Fix verify-client polling (H3) | `apps/web/app/verify/verify-client.tsx` | No | Low |
| X2.9 | Add error.tsx boundaries | New files in key route segments | No | Low |
| X2.10 | Add loading.tsx boundaries | New files in key route segments | No | Low |
| X2.11 | Add Stripe webhook reconciliation | New admin endpoint or cron | No | Medium |
| X2.12 | Fix admin health query to use today's data (M8) | `apps/web/app/api/admin/health/route.ts` | No | Low |

**Estimated effort:** 3-5 engineering days

### Phase X3 — Revenue Optimization

| # | Issue | Files to Modify | DB Migration | Risk |
|---|---|---|---|---|
| X3.1 | Add `/pricing` page | New `apps/web/app/pricing/page.tsx` | No | Low |
| X3.2 | Add pricing to landing page | `apps/web/app/page.tsx` | No | Low |
| X3.3 | Add usage-based upgrade nudges | `apps/web/app/verify/verify-client.tsx` | No | Low |
| X3.4 | Add billing anomaly detection | New admin alerts | No | Medium |
| X3.5 | Add past_due grace period for Pro users | `apps/web/app/api/verify/route.ts` | No | Low |
| X3.6 | Add annual pricing option | Stripe config + checkout route | No | Low |

**Estimated effort:** 2-3 engineering days

### Phase X4 — Technical Debt Cleanup

| # | Issue | Files to Modify | DB Migration | Risk |
|---|---|---|---|---|
| X4.1 | Extract rate limiting into `lib/rate-limiter.ts` | `apps/web/app/api/verify/route.ts`, new lib file | No | Low |
| X4.2 | Add a data access layer | New `lib/dal/` directory, refactor all raw SQL | No | Medium |
| X4.3 | Add integration tests | New `__tests__/` directory | No | Low |
| X4.4 | Add atomic rate limit check (H1) | `apps/web/app/api/verify/route.ts` or `lib/rate-limiter.ts` | No | Low |
| X4.5 | Fix pnpm vs npm inconsistency | `vercel.json`, `.github/workflows/ci.yml`, `package.json` | No | Low |
| X4.6 | Add proper migration system | New migration runner, numbered migrations | No | Medium |
| X4.7 | Add forgot-password flow | New routes and pages | **Yes** — add `password_reset_tokens` table | Medium |

**Estimated effort:** 5-8 engineering days

---

## "If I Were Launching This Tomorrow" Checklist

### Non-Negotiable (Block Launch)

- [ ] **Fix `job_metrics` UNIQUE constraint** — observability is currently zero (C1)
- [ ] **Fix verify route serverless compatibility** — jobs may never complete on Vercel (C2)
- [ ] **Fix account page billing forms** — users literally cannot upgrade to Pro (C3)
- [ ] **Fix job status enum** — job polling page is infinitely looping (C4)
- [ ] **Fix export.md auth bypass** — any UUID leaks all pack data (C5)
- [ ] **Fix "$X/month" placeholder** — instant credibility loss (M6)
- [ ] **Add checkout idempotency guard** — prevent double-billing (H6)
- [ ] **Fix IP limit vs Pro limit conflict** — Pro users capped at 25/day on shared IPs
- [ ] **Fix logout redirect** — users see raw JSON after logout
- [ ] **Add `stripe_customer_id` index** — webhook handling does full table scan

### Should Do Before Inviting Paid Users

- [ ] **Add login rate limiting** — prevent brute-force attacks (C7)
- [ ] **Fix verify-client single-poll issue** — users likely see 404 on first verification (H3)
- [ ] **Update trust page** — stop claiming retrieval is "planned" when it exists (M5)
- [ ] **Fix version numbers** — admin panel and pack page show "0.1.0" (M4)
- [ ] **Add error boundaries** — prevent white-screen-of-death on DB errors
- [ ] **Enable TypeScript checking in CI** — stop shipping type errors

### Should Do Within First 30 Days

- [ ] **Add pricing page** — users need to know what they're paying for
- [ ] **Add table cleanup crons** — rate_limits tables grow unbounded
- [ ] **Add Stripe webhook reconciliation** — catch missed webhooks
- [ ] **Add past_due grace period** — don't punish late payers instantly
- [ ] **Hash session tokens** — protect against DB compromise
- [ ] **Consolidate session logic** — reduce bug surface from 4x duplication

### Can Wait

- [ ] Forgot password flow
- [ ] Email verification
- [ ] Account deletion
- [ ] Annual pricing
- [ ] Favicon and OpenGraph metadata
- [ ] Data access layer refactor

---

*End of audit. All findings reference specific files and line numbers in the repository as of commit on branch `main` at version 0.3.2.*
