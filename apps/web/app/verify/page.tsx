import Link from "next/link";
import { headers } from "next/headers";
import { requireBetaKey } from "@/lib/access";
import { VerifyClient } from "./verify-client";

// N3: Beta key is read ONLY from the x-proofmode-key request header.
// Query param (?key=...) support has been removed entirely.
export default async function VerifyPage() {
  const headerStore = await headers();
  const reqLike = {
    headers: headerStore,
    url: "https://proofmode.local/verify",
  };
  const access = requireBetaKey(reqLike);
  if (!access.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12 text-slate-100">
        <h1 className="mb-2 text-3xl font-semibold text-cyan-300">Invite-only beta</h1>
        <p className="text-slate-300">
          ProofMode AI verification is currently available to invited beta testers.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          This beta requires an access key header:{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5">x-proofmode-key</code>.
        </p>
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm">
          <p className="mb-2 font-medium text-slate-300">How to test (curl / Postman):</p>
          <pre className="overflow-x-auto text-xs text-slate-400">{`curl -sS -X POST https://YOUR_DOMAIN/api/verify \\\n  -H "Content-Type: application/json" \\\n  -H "x-proofmode-key: YOUR_BETA_KEY" \\\n  -d '{"text":"The Eiffel Tower is in Paris."}'`}</pre>
        </div>
        <Link href="/" className="mt-6 text-cyan-400 underline hover:text-cyan-300">
          Back to homepage
        </Link>
      </main>
    );
  }
  // Forward the validated key to the client so it can authenticate
  // browser-side fetch calls to /api/verify via the same header.
  const betaKey = headerStore.get("x-proofmode-key") ?? null;
  return <VerifyClient betaKey={betaKey} />;
}
