# ProofMode Demo Script

Use this as a repeatable demo flow for investor and user calls.

## 60-second script (tight)

1. Open landing page (`/`) and state the value proposition: structured claim-by-claim verification.
2. Go to `/verify?key=...` and paste sample text.
3. Run verification and open generated pack.
4. Show claim statuses (Supported / Mixed / Unsupported) and confidence.
5. Open evidence snippets to show traceability.
6. Click Export Markdown and mention that outputs are shareable for downstream review.

Suggested narration:

> "ProofMode turns unstructured text into an auditable evidence pack. Instead of a single AI answer, you get claim-level status, confidence, and source snippets you can review and export."

## 3-minute script (deeper)

### A) Framing (30-45s)
- "Teams already use AI for drafting, but quality control is inconsistent."
- "ProofMode provides conservative verification outputs that are easier to review and share."

### B) Product walkthrough (90-120s)
1. **Landing (`/`)**
   - Point out positioning and trust framing.
2. **Verify (`/verify?key=...`)**
   - Paste sample input and run verification.
3. **Pack page (`/packs/:id`)**
   - Show each extracted claim with status + confidence.
   - Show evidence entries and explain retrieval-backed traceability.
4. **Export (`/api/packs/:id/export.md`)**
   - Download markdown and explain portability to docs, wikis, or client updates.

### C) Credibility + controls (45-60s)
- Guardrails: input cap, timeouts, rate limits.
- Invite-only beta access via shared key.
- Fail-open retrieval behavior prevents hard failures when external retrieval is unavailable.

## Exact sample inputs

### Primary sample (required)

```text
The Eiffel Tower is in Paris. The Moon is made of cheese.
```

### Optional secondary sample

```text
Neon is a serverless Postgres platform. The Pacific Ocean is the smallest ocean on Earth.
```

## What to show on screen

1. Landing page (`/`)
2. Verify page (`/verify?key=...`)
3. Submission in progress (brief loading state)
4. Pack page with claim table and evidence
5. Markdown export download action

## Known limits (say calmly)

- "This is a controlled beta, so access is invite-only."
- "Classification is conservative and may return Mixed when confidence is limited."
- "Retrieval can be empty in fail-open mode if external search is unavailable."
- "Human review is still expected for high-stakes decisions."

## How retrieval changes the credibility story

- Without retrieval: output is still structured, but evidence may be absent.
- With retrieval enabled: claims can include source-linked snippets, improving auditability and reviewer trust.
- Message to audience: "We prioritize traceability over confident-sounding prose."
