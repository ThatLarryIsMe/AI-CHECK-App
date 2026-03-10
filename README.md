# Factward

**v0.3.2** — Claim-level verification for professional teams.

Factward is a claim-level verification product for professional teams that need structured, auditable assessments of written material. Users submit text, the engine extracts factual claims, classifies each claim with conservative reasoning, and produces an evidence pack designed for downstream review, export, and client-facing reporting.

## Architecture

```
+------------------------+
|     Next.js 14 UI      |
|  /, /verify, /packs/*  |
+-----------+------------+
            |
            v
+------------------------+
|   API Routes (web app) |
| verify, waitlist, pack |
+-----------+------------+
            |
         +--+--+
         |     |
         v     v
+---------------+  +-------------------------+
| OpenAI        |  | Postgres (Neon)         |
| gpt-4o-mini   |  | jobs, packs, waitlist,  |
| extract +     |  | job_metrics             |
| classify      |  +-------------------------+
+---------------+
         |
         v (optional)
+------------------------+
|   Brave Search API     |
|   retrieval layer      |
+------------------------+
```

## Stack

- Next.js 14
- Postgres (Neon)
- OpenAI `gpt-4o-mini`
- Brave Search API (optional — retrieval layer)

## Guardrails

- LLM timeout: 15 seconds per request
- Input length limit: 5,000 characters
- Rate limiting: 10 requests/minute per IP on verify endpoint
- Per-claim fallback: claim classification failures degrade to safe fallback output instead of failing the full pack
- Access gate: `x-factward-key` header required on all protected routes (header-only; query param not supported)
- Constant-time key comparison via `crypto.timingSafeEqual` (prevents timing-based key enumeration)

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `BETA_ACCESS_KEY` | Yes | Invite-only beta access key (`x-factward-key` header) |
| `BRAVE_API_KEY` | No | Enables Brave Search retrieval layer |

> Note: `ENGINE_VERSION` is no longer an environment variable. Version is managed via `version.ts` at the repo root.

## Run locally

```
pnpm install
pnpm dev
```

## Database schema

Run `infra/db/schema.sql` in the Neon SQL editor before using persistence-backed routes.

Tables: `jobs`, `packs`, `waitlist_signups`, `job_metrics`

## Roadmap

| Phase | Status | Summary |
|---|---|---|
| J | ✅ Done | Brave Search retrieval layer (optional, fail-open) |
| K | ✅ Done | Controlled public beta — `BETA_ACCESS_KEY` access gate |
| M | ✅ Done | Schema fix, single source of truth, Vercel deploy fix, CI |
| N1 | ✅ Done | Production observability — `job_metrics` + `/api/admin/health` |
| N2 | ✅ Done | Versioning discipline — `version.ts` single source of truth |
| N3 | ✅ Done | Access gate hardening — constant-time compare, header-only |
| N4 | ✅ Done | README hardening — current with v0.3.2 state |
| O | 🔲 Next | TBD |

## Deploy (Vercel)

Deploy target: **Vercel**.

### Required environment variables

Set all variables from the table above in Vercel project settings. `BRAVE_API_KEY` is optional.

### Deployment steps

1. Apply `infra/db/schema.sql` to your Neon Postgres database.
2. Set all required environment variables in Vercel project settings.
3. Deploy the web app to Vercel.
4. Run smoke tests:
   - Open `/`
   - Open `/verify` (no key needed for UI load)
   - Submit a verify request with `x-factward-key: <your-key>` header
   - Open the generated evidence pack
   - Export markdown from the pack page
   - Confirm `GET /api/admin/health` returns `{ version, totalJobsToday, ... }` with valid key header

### Cost safety notes

- Rate limit is active on `/api/verify` (10 requests/min/IP).
- Input cap is active (5,000 characters).
- Upstream timeouts are active for model and retrieval calls.

## Contributing

- Open issues for bugs, product requests, or ops concerns in GitHub Issues.
- Use the provided issue templates under `.github/ISSUE_TEMPLATE/`.
- Suggested labels for triage: `bug`, `product`, `ops`
- Local development:

```
pnpm install
pnpm dev
```
