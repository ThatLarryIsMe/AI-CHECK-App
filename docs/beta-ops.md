# Beta Ops Runbook

This runbook defines how to safely operate ProofMode's invite-only public beta in production.

## 1) Beta key sharing policy

- Treat `BETA_ACCESS_KEY` as a secret.
- Share it only in private channels (1:1 DM, secure password manager share, or direct email to known testers).
- Never post the key in public docs, GitHub issues, screenshots, demos, recordings, or social media.
- If the key appears in any public place, rotate immediately.

## 2) Key rotation procedure

Use this when a key is leaked, a tester cohort changes, or as routine hygiene.

1. Open Vercel project settings for production.
2. Go to **Environment Variables**.
3. Update `BETA_ACCESS_KEY` to a new high-entropy value.
4. Redeploy production so the new key is active.
5. Privately send the new key to the active beta cohort.
6. Verify:
   - `/verify?key=<new_key>` works.
   - old key no longer works.

## 3) Fast beta disable procedure

To quickly disable broad beta access without taking the app down:

1. Set `BETA_ACCESS_KEY` to a newly generated value that is not shared.
2. Redeploy production.
3. Result: existing public testers can no longer access `/verify` until a new key is distributed.

## 4) Monitoring checklist

Run this checklist daily during active beta windows:

- **Vercel logs**
  - Check recent production function logs for elevated error volume.
- **`errorType` frequency**
  - Watch for spikes in `UNKNOWN_ERROR`, `INPUT_TOO_LONG`, and timeout-driven failures.
- **OpenAI timeout counts**
  - Track timeout-related failures and latency drift.
- **Brave retrieval failures**
  - Review retrieval error rates.
  - Retrieval is fail-open; evidence can be empty while verification still completes.

## 5) Abuse response playbook

If abuse, overload, or cost spikes appear:

1. **Raise strictness quickly**
   - Reduce verify route rate limit.
   - Shorten maximum input cap.
2. **Temporarily remove `BRAVE_API_KEY`**
   - Retrieval disables automatically (LLM-only mode remains available).
3. **Rotate `BETA_ACCESS_KEY`**
   - Restrict access to a smaller trusted tester group.

No new infrastructure is required for the steps above.
