# Architecture Decisions

This file records key architectural decisions for the ProofMode AI project.

---

## Phase A — Monorepo Bootstrap
- **Decision:** pnpm monorepo with `apps/web` (Next.js) and `packages/core`.
- **Rationale:** Shared types between web and future API consumers without duplication.

## Phase B — DB Schema + Verify Job Flow
- **Decision:** Neon (Postgres) for job and pack persistence; mock engine for Phase B.
- **Rationale:** Real DB from day one avoids migration pain; mock engine lets UI work before LLM integration.
- **Schema:** `jobs(id, status, pack_id, created_at)`, `packs(id, claims JSONB, created_at)`.

## Phase C — LLM Engine
- **Decision:** OpenAI GPT-4o-mini as the verification engine; `engineVersion` stored on pack.
- **Rationale:** Cost-effective, sufficient for claim classification at MVP scale.

## Phase D — Hardening
- **Decision:** Input validation (max 10,000 chars), rate limiting on `/api/verify`.
- **Rationale:** Prevent abuse before public launch.

## Phase E — Landing Page + Export
- **Decision:** Hero + how-it-works + waitlist section on `/`; single Markdown export button on packs page.
- **Rationale:** Conversion-first landing page to capture early interest while demo is live.

## Phase F — Waitlist DB + Jobs DB
- **Decision:** Persist waitlist emails to Neon; remove `user_id` from `createJob` (not needed at MVP).
- **Rationale:** Simplifies schema; user auth deferred post-launch.

## Phase G1 — Conversion Polish
- **Decision:** localStorage-based verification history (key: `proofmode_history`, max 10 entries) displayed as a sidebar on `/verify`.
- **Rationale:** Zero-backend history gives returning users immediate recall without auth.
- **Decision:** Export v2 adds a client-side JSON download (Blob URL) alongside the existing Markdown route.
- **Rationale:** JSON export enables downstream integrations; Blob approach avoids a new API route.
- **Decision:** Error UX upgraded to a bordered error card with a dismiss button; pack-load errors include a Retry button.
- **Rationale:** Plain `<p className="text-red-400">` was easy to miss; card treatment is scannable and actionable.
