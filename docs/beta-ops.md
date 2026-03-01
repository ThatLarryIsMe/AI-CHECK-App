# Beta Ops Runbook

This runbook defines how to safely operate ProofMode's invite-only public beta in production.

> **P4 Update:** No waitlist. Access is invite-code only — operators provision invite codes manually.
> > End users sign up at `/signup` with their code and log in at `/login`.
> >
> > ## 1) End-user access
> >
> > End users access the beta by:
> >
> > 1. Receiving an invite code (provisioned manually by the operator).
> > 2. 2. Visiting `/signup` and creating an account with that invite code.
> >    3. 3. Logging in at `/login` — session cookie (`pm_session`) is set automatically.
> >       4. 4. Navigating to `/verify` — server-side gate redirects unauthenticated users to `/login`.
> >         
> >          5. There is no waitlist. There is no `x-proofmode-key` involved in the end-user flow.
> >         
> >          6. ## 2) Admin / API key policy
> >         
> >          7. - `BETA_ACCESS_KEY` is **admin-only**: required for `GET /api/admin/stats` and `GET /api/admin/health`.
> > - Treat it as a secret. Share only in private channels.
> > - - Never post the key in public docs, GitHub issues, screenshots, demos, recordings, or social media.
> >   - - If the key appears in any public place, rotate immediately.
> >    
> >     - ## 3) Key rotation procedure
> >    
> >     - Use this when a key is leaked, a tester cohort changes, or as routine hygiene.
> >    
> >     - 1. Open Vercel project settings for production.
> > 2. Go to **Environment Variables**.
> > 3. 3. Update `BETA_ACCESS_KEY` to a new high-entropy value.
> >    4. 4. Redeploy production so the new key is active.
> >       5. 5. Verify: new key works via header; old key returns `401 Unauthorized`.
> >         
> >          6. ## 4) Admin route access (header-only)

All admin routes require `x-proofmode-key`. End-user routes use session cookies.

### Check admin health stats

```bash
curl -sS -X GET https://YOUR_DOMAIN/api/admin/health \
  -H "x-proofmode-key: YOUR_BETA_KEY"
```

### Check aggregate admin stats

```bash
curl -sS -X GET https://YOUR_DOMAIN/api/admin/stats \
  -H "x-proofmode-key: YOUR_BETA_KEY"
```

## 5) Fast beta disable procedure

To quickly disable broad beta access without taking the app down:

1. Disable new signups (or remove invite code provisioning).
2. 2. Optionally: purge `sessions` table to force all users to re-authenticate.
   3. 3. Result: users without a valid session cannot access `/verify`.
     
      4. ## 6) Per-user rate limits
     
      5. - **Free plan**: 10 verifications per 24-hour rolling window.
         - - **Pro plan**: 200 verifications per 24-hour rolling window.
           - - Exceeded limit returns `429 { error: "Daily user limit reached." }`.
             - - IP limits (25/IP/day, 500 global/day) remain in place.
               - - Upgrade prompt shown in nav (if free) and on `/verify` page.
                 - 
                 ## 7) Monitoring checklist

                 Run this checklist daily during active beta windows:

                 - **Vercel logs** — Check recent production function logs for elevated error volume.
                 - - **`errorType` frequency** — Watch for spikes in `UNKNOWN_ERROR`, `INPUT_TOO_LONG`, and timeout-driven failures.
                   - - **OpenAI timeout counts** — Track timeout-related failures and latency drift.
                   - **Brave retrieval failures** — Review retrieval error rates.
                   - - **`user_rate_limited` events** — Monitor for users hitting the daily cap.

                   ## 8) Abuse response playbook

                   If abuse, overload, or cost spikes appear:

                   1. **Raise strictness quickly** — Reduce verify route rate limit; shorten max input cap.
                   2. 2. **Temporarily remove `BRAVE_API_KEY`** — Retrieval disables automatically.
                      3. 3. **Rotate `BETA_ACCESS_KEY`** — Restricts admin API access.
                         4. 4. **Adjust plan limits** in `/api/verify/route.ts` and redeploy to lower user caps.
