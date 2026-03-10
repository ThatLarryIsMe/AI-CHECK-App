import Link from "next/link";
import { getSessionFromCookie } from "@/lib/auth";

function CheckSvg({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`shrink-0 mt-0.5 ${className}`}>
      <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const freeFeatures = [
  "2 verifications per day",
  "10,000 character inputs",
  "URL & PDF fact-checking",
  "Source-backed verdicts with reasoning",
  "Shareable Trust Score reports",
  "Embeddable verification badge",
];

const proFeatures = [
  "200 verifications per day",
  "Up to 15 claims per check (3x deeper)",
  "15,000 character inputs (articles, not just snippets)",
  "URL & PDF fact-checking",
  "Exportable evidence packs (Markdown & JSON)",
  "API access for your workflow",
];

const comparisonRows = [
  { feature: "Daily verifications", free: "2", pro: "200" },
  { feature: "Anonymous trial check", free: "1 (no signup)", pro: "—" },
  { feature: "Claims per check", free: "5", pro: "15" },
  { feature: "Character limit", free: "10,000", pro: "15,000" },
  { feature: "URL fact-checking", free: true, pro: true },
  { feature: "PDF fact-checking", free: true, pro: true },
  { feature: "Shareable reports", free: true, pro: true },
  { feature: "Trust Score badge", free: true, pro: true },
  { feature: "Export (Markdown/JSON)", free: false, pro: true },
];

const faqs = [
  {
    q: "Can I use ProofMode without an account?",
    a: "Yes! You get 1 free trial check without signing up. Create a free account (takes seconds) to get 2 verifications per day.",
  },
  {
    q: "What counts as one verification?",
    a: "One verification is a single text submission, URL, or PDF. Each verification can contain multiple claims — they're all checked at once.",
  },
  {
    q: "Can I cancel my Pro subscription?",
    a: "Yes, you can cancel anytime from your Account page. You'll keep Pro access until the end of your billing period.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards through Stripe. Your payment information is never stored on our servers.",
  },
];

export default async function PricingPage() {
  const user = await getSessionFromCookie();
  const isPro = user?.plan === "pro" && user?.planStatus === "active";

  return (
    <main className="px-6 py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-400">
            Pricing
          </p>
          <h1 className="text-display-sm md:text-display font-semibold text-white mb-3">
            One wrong fact costs more than a subscription.
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Try one check free — no signup needed. Create an account for 2 checks a day.
            Go Pro when accuracy is part of your daily workflow.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
          {/* Free */}
          <div className="rounded-xl border border-surface-800/60 bg-surface-900 p-8 text-left">
            <h2 className="mb-1 text-lg font-semibold text-white">Free</h2>
            <p className="mb-1">
              <span className="text-3xl font-bold text-white">$0</span>
              <span className="text-sm text-slate-500 ml-1">/month</span>
            </p>
            <p className="mb-6 text-sm text-slate-400">Try it out, see the quality</p>
            <ul className="mb-8 space-y-3 text-sm text-slate-300">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckSvg className="text-slate-500" />
                  {f}
                </li>
              ))}
            </ul>
            {!user ? (
              <Link
                href="/verify"
                className="block rounded-lg border border-slate-700 px-4 py-2.5 text-center text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Try it free
              </Link>
            ) : (
              <span className="block rounded-lg border border-surface-800/60 px-4 py-2.5 text-center text-sm text-slate-500">
                {isPro ? "Included" : "Current plan"}
              </span>
            )}
          </div>

          {/* Pro */}
          <div className="relative rounded-xl border-2 border-brand-600 bg-surface-900 p-8 text-left">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-bold text-white">
              MOST POPULAR
            </span>
            <h2 className="mb-1 text-lg font-semibold text-white">Pro</h2>
            <p className="mb-1">
              <span className="text-3xl font-bold text-white">$15</span>
              <span className="text-sm text-slate-500 ml-1">/month</span>
            </p>
            <p className="mb-6 text-sm text-slate-400">For professionals who publish</p>
            <ul className="mb-8 space-y-3 text-sm text-slate-300">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckSvg className="text-brand-500" />
                  {f}
                </li>
              ))}
            </ul>
            {isPro ? (
              <span className="block rounded-lg border border-brand-600/30 bg-brand-600/10 px-4 py-2.5 text-center text-sm font-semibold text-brand-400">
                Current plan
              </span>
            ) : user ? (
              <form action="/api/billing/checkout" method="POST">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
                >
                  Upgrade to Pro
                </button>
              </form>
            ) : (
              <Link
                href="/signup"
                className="block rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-500"
              >
                Sign up & upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Need more? */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Need higher limits or team access?{" "}
            <a href="mailto:hello@proofmode.ai" className="text-brand-400 hover:text-brand-300">
              Contact us
            </a>
          </p>
        </div>

        {/* Comparison table */}
        <div className="mt-16">
          <h2 className="text-heading font-semibold text-white text-center mb-8">
            Compare plans
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full max-w-2xl mx-auto text-sm">
              <thead>
                <tr className="border-b border-surface-800/60 text-left">
                  <th className="py-3 pr-4 text-slate-400 font-medium">Feature</th>
                  <th className="py-3 px-4 text-slate-400 font-medium text-center">Free</th>
                  <th className="py-3 pl-4 text-slate-400 font-medium text-center">Pro</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b border-surface-800/40">
                    <td className="py-3 pr-4 text-slate-300">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {typeof row.free === "boolean" ? (
                        row.free ? (
                          <CheckSvg className="text-slate-500 inline-block" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )
                      ) : (
                        <span className="text-slate-400">{row.free}</span>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-center">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <CheckSvg className="text-brand-500 inline-block" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )
                      ) : (
                        <span className="text-white font-medium">{row.pro}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-heading font-semibold text-white text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-surface-800/40 pb-6">
                <h3 className="font-medium text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
