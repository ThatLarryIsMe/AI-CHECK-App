# AI-CHECK-App — Architecture Decisions

---

## Phase O1 — Key-Entry UX (2026-02-28)

**Decision:** Remove server-side beta key gate from `verify/page.tsx`; delegate key reading entirely to `VerifyClient` client component via prop.

**Why:** Server-side `headers()` call caused hydration friction and forced an async server component. Client already owns the interactive key-entry modal, so the gate belongs there.

**Files changed:** `apps/web/app/verify/page.tsx` (-37 lines), `apps/web/app/verify/verify-client.tsx` (prop added).

---

## Phase O2 — Pack Sharing: Copy Link + Copy Summary (2026-02-28)

**Decision:** Add two clipboard-sharing helpers directly to the pack detail page (`apps/web/app/packs/[id]/page.tsx`). No new libraries, no API changes.

**Copy Link:** Calls `navigator.clipboard.writeText(window.location.href)`. Button shows inline green "✓ Copied!" state for 2 seconds then resets.

**Copy Summary:** Builds a structured plaintext summary on the client from already-loaded pack data:
- Header: `ProofMode v{VERSION}`, Pack ID, Generated At (if present)
- Totals line: supported / mixed / unsupported / total
- Avg confidence (computed from existing `confidence` field)
- Retrieval mode: "Evidence attached" when `evidence.length > 0`, else "LLM-only mode"
- Top 3 claim texts (truncated to 120 chars each) with their classification label
- Pack URL appended at the bottom

**Why:** Sharing a pack should require zero friction. Both operations are pure client-side clipboard writes — no new endpoints needed.

**Placement:** Buttons sit in the existing export button row (after ↓ Markdown / ↓ JSON), separated by a thin vertical divider for visual grouping.

**Files changed:** `apps/web/app/packs/[id]/page.tsx` (+129 lines, -59 lines). `decisions.md` (created).

---

## Phase O3 — Admin Weekly Ops Report (2026-02-28)

**Decision:** Create `apps/web/app/admin/page.tsx` — a client-side admin dashboard that fetches `/api/admin/stats` and `/api/admin/health` in parallel and renders a structured weekly ops report.

**Access control:** Page prompts for the `x-proofmode-key` on load (password input). Key is held in React state only; never persisted to localStorage or cookies. Incorrect keys surface the API error message inline with a re-enter option.

**Data displayed:**
- **Lifetime Totals:** total jobs, total packs, waitlist signups, avg claims/pack
- **Today (UTC):** jobs last 24h, jobs since midnight UTC, avg job duration (red if >8 000 ms)
- **Quality Signals:** timeout rate (red if >5%), retrieval rate (evidence attached vs LLM-only)
- **Weekly Summary Export:** pre-formatted plaintext block ready to copy into Slack/email

**Auto-refresh:** Polls both endpoints every 60 seconds while the report is in `ready` state; manual ↺ Refresh button also available.

**Why:** The two admin API routes already existed and returned all the ops data needed. A zero-dependency client page was the minimal path to surfacing this data for weekly reviews.

**Files changed:** `apps/web/app/admin/page.tsx` (created, 276 lines). `decisions.md` (updated).

---

---
