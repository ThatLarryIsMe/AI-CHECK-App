import Link from "next/link";
import { headers } from "next/headers";
import { requireBetaKey } from "@/lib/access";
import { VerifyClient } from "./verify-client";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const betaKey = resolvedSearchParams?.key?.trim() ?? null;
  const headerStore = await headers();
  const reqLike = {
    headers: headerStore,
    url: `https://proofmode.local/verify${betaKey ? `?key=${encodeURIComponent(betaKey)}` : ""}`,
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
          If you have an invite key, open <code>/verify?key=YOUR_KEY</code>.
        </p>
        <Link href="/" className="mt-6 text-cyan-400 underline hover:text-cyan-300">
          Back to homepage
        </Link>
      </main>
    );
  }

  return <VerifyClient betaKey={betaKey} />;
}
