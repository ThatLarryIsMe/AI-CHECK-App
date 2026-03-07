import Link from "next/link";
import { getSessionFromCookie } from "@/lib/auth";

export default async function PricingPage() {
  const user = await getSessionFromCookie();
  const isPro = user?.plan === "pro" && user?.planStatus === "active";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-400">
          Simple pricing
        </p>
        <h1 className="mb-3 text-4xl font-bold text-white">
          Start free. Upgrade when you need more.
        </h1>
        <p className="mb-14 text-lg text-slate-400 max-w-xl mx-auto">
          No hidden fees, no per-check charges. Pick the plan that fits how you work
          and change anytime.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Free tier */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-8 text-left">
            <h2 className="mb-1 text-lg font-semibold text-white">Free</h2>
            <p className="mb-2 text-4xl font-bold text-white">
              $0<span className="text-base font-normal text-slate-500">/mo</span>
            </p>
            <p className="mb-6 text-sm text-slate-400">Perfect for getting started</p>
            <ul className="mb-8 space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">&#10003;</span>
                10 verifications per day
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">&#10003;</span>
                Automatic claim extraction
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">&#10003;</span>
                Evidence-backed verdicts
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">&#10003;</span>
                Shareable verification reports
              </li>
            </ul>
            {!user ? (
              <Link
                href="/signup"
                className="block rounded-lg border border-slate-600 px-4 py-2.5 text-center text-sm font-semibold text-slate-300 transition hover:border-slate-400"
              >
                Get started free
              </Link>
            ) : (
              <span className="block rounded-lg border border-slate-700 px-4 py-2.5 text-center text-sm text-slate-500">
                {isPro ? "Included" : "Current plan"}
              </span>
            )}
          </div>

          {/* Pro tier */}
          <div className="relative rounded-xl border-2 border-cyan-500 bg-slate-900 p-8 text-left">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-3 py-0.5 text-xs font-bold text-slate-950">
              MOST POPULAR
            </span>
            <h2 className="mb-1 text-lg font-semibold text-white">Pro</h2>
            <p className="mb-2 text-4xl font-bold text-white">
              $15<span className="text-base font-normal text-slate-500">/mo</span>
            </p>
            <p className="mb-6 text-sm text-slate-400">For daily fact-checkers</p>
            <ul className="mb-8 space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">&#10003;</span>
                200 verifications per day
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">&#10003;</span>
                Up to 15 claims per check (vs 5 on Free)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">&#10003;</span>
                15,000 character input limit (3x Free)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">&#10003;</span>
                URL &amp; PDF fact-checking
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">&#10003;</span>
                Shareable verification reports with Trust Score
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-cyan-400">&#10003;</span>
                Markdown &amp; JSON report exports
              </li>
            </ul>
            {isPro ? (
              <span className="block rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-center text-sm font-semibold text-cyan-400">
                Current plan
              </span>
            ) : user ? (
              <form action="/api/billing/checkout" method="POST">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Upgrade to Pro
                </button>
              </form>
            ) : (
              <Link
                href="/signup"
                className="block rounded-lg bg-cyan-500 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Sign up &amp; upgrade
              </Link>
            )}
          </div>
        </div>

        <p className="mt-12 text-sm text-slate-500">
          All plans include full access during the beta period. Cancel anytime.
          Pricing may change before general availability.
        </p>
      </div>
    </main>
  );
}
