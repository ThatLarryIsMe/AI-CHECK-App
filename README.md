# ProofMode

ProofMode is a claim-level verification product for professional teams that need structured, auditable assessments of written material. Users submit text, the engine extracts factual claims, classifies each claim with conservative reasoning, and produces an evidence pack designed for downstream review, export, and client-facing reporting.

## Architecture

```text
+------------------------+
|      Next.js 14 UI     |
|  /, /verify, /packs/*  |
+-----------+------------+
            |
            v
+------------------------+
|   API Routes (web app) |
| verify, waitlist, pack |
+-----------+------------+
            |
            v
+------------------------+        +-------------------------+
| OpenAI gpt-4o-mini     |        | Postgres (Neon)         |
| extract + classify     |        | jobs, packs, waitlist   |
+------------------------+        +-------------------------+
```

## Stack

- Next.js 14
- Postgres (Neon)
- OpenAI `gpt-4o-mini`

## Guardrails

- LLM timeout: 15 seconds per request
- Input length limit: 5,000 characters
- Rate limiting: 10 requests/minute per IP on verify endpoint
- Per-claim fallback: claim classification failures degrade to safe fallback output instead of failing the full pack

## Environment variables

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `ENGINE_VERSION`

## Run locally

```bash
pnpm install
pnpm dev
```

## Database schema

Run `infra/db/schema.sql` in the Neon SQL editor before using persistence-backed routes.

## Roadmap

- Phase J: retrieval layer
- Phase K: authentication + team workspaces

## Deploy (Vercel)

Deploy target: **Vercel**.

### Required environment variables

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `BRAVE_API_KEY` (optional)
- `ENGINE_VERSION`
- `BETA_ACCESS_KEY`

### Deployment steps

1. Apply `infra/db/schema.sql` to your Neon Postgres database.
2. Set all required environment variables in Vercel project settings.
3. Deploy the web app to Vercel.
4. Run smoke tests:
   - Open `/`
   - Open `/verify?key=...`
   - Submit a verify request
   - Open the generated evidence pack
   - Export markdown from the pack page

### Cost safety notes

- Rate limit is active on `/api/verify` (10 requests/min/IP).
- Input cap is active (5,000 characters).
- Upstream timeouts are active for model and retrieval calls.
