import Link from "next/link";
import { pool } from "@/lib/db";

async function getGlobalStats(): Promise<{ totalClaims: number; totalPacks: number }> {
  try {
    const [claimsResult, packsResult] = await Promise.all([
      pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM claims`),
      pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM packs`),
    ]);
    return {
      totalClaims: parseInt(claimsResult.rows[0]?.count ?? "0", 10),
      totalPacks: parseInt(packsResult.rows[0]?.count ?? "0", 10),
    };
  } catch {
    return { totalClaims: 0, totalPacks: 0 };
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

const useCases = [
  {
    title: "Journalists & Editors",
    desc: "Verify every claim in a story before it goes live. Protect your newsroom from retractions and corrections.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M3 8h14M8 8v9" />
      </svg>
    ),
  },
  {
    title: "AI Content Review",
    desc: "Don't publish ChatGPT or Claude output without checking it. We catch the hallucinations so your readers never see them.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v4M10 14v4M2 10h4M14 10h4M4.93 4.93l2.83 2.83M12.24 12.24l2.83 2.83M15.07 4.93l-2.83 2.83M7.76 12.24l-2.83 2.83" />
      </svg>
    ),
  },
  {
    title: "Researchers & Academics",
    desc: "Upload a PDF and verify cited statistics, dates, and claims. Get the rigor of peer review in seconds, not months.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6l-4-4z" />
        <path d="M12 2v4h4M8 10h4M8 14h4M8 6h1" />
      </svg>
    ),
  },
  {
    title: "Newsletter Writers",
    desc: "One wrong stat can tank your credibility with thousands of subscribers. Verify before you hit send.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 5a3 3 0 11-6 0 3 3 0 016 0zM8 15a3 3 0 11-6 0 3 3 0 016 0zM18 15a3 3 0 11-6 0 3 3 0 016 0z" />
        <path d="M7.5 13.5l5-5M7.5 6.5l5 5" />
      </svg>
    ),
  },
  {
    title: "Content & Marketing Teams",
    desc: "Catch errors in blog posts, whitepapers, and campaigns before your audience does. Earn trust at scale.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2l4 4-9 9H5v-4l9-9z" />
        <path d="M12 4l4 4" />
      </svg>
    ),
  },
  {
    title: "PR & Communications",
    desc: "Verify claims in press releases and investor materials before they reach reporters who will check anyway.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h14v14H3z" />
        <path d="M7 7h6M7 10h6M7 13h3" />
      </svg>
    ),
  },
];

const differentiators = [
  {
    label: "Evidence-first",
    desc: "Every verdict is grounded in real web sources. If we can't find evidence, we say so — we never guess.",
  },
  {
    label: "Claim-level precision",
    desc: "We don't rate entire articles. Every individual claim gets its own sources, verdict, and confidence score.",
  },
  {
    label: "Show-your-work transparent",
    desc: "See exactly which sources support or contradict each claim, and the reasoning behind every verdict.",
  },
  {
    label: "Time-aware freshness",
    desc: "Facts have a shelf life. Factward tracks when claims go stale and tells you when to re-verify.",
  },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-brand-500">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Home() {
  const stats = await getGlobalStats();
  const showCounter = stats.totalClaims > 0;

  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 md:py-32 lg:py-40 text-center">
        <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-brand-400">
          Fact-check anything in seconds
        </p>
        <h1 className="text-display-sm md:text-display lg:text-display-lg font-bold text-white max-w-3xl">
          Publish with confidence.{" "}
          <span className="text-brand-400">Every claim verified.</span>
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          One wrong fact can cost you your credibility. Factward breaks any text into
          individual claims, checks each one against real web sources, and shows you
          exactly what&apos;s supported, what&apos;s not, and what can&apos;t be verified.
        </p>

        <ul className="mt-10 text-left max-w-xl w-full space-y-4">
          <li className="flex items-start gap-3">
            <CheckIcon />
            <span className="text-slate-300">
              <strong className="text-white font-medium">Every claim, individually verified</strong> — not
              a vague &quot;this article seems accurate.&quot; Each factual statement gets its own sources and verdict.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon />
            <span className="text-slate-300">
              <strong className="text-white font-medium">Sources you can check yourself</strong> — see
              the web evidence behind every verdict. We show our work so you don&apos;t have to trust ours.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon />
            <span className="text-slate-300">
              <strong className="text-white font-medium">Honest when it doesn&apos;t know</strong> — claims
              without sufficient evidence are flagged as &quot;Insufficient,&quot; never guessed.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon />
            <span className="text-slate-300">
              <strong className="text-white font-medium">Text, URLs, or PDFs</strong> — paste an article,
              drop a link, or upload a research paper. Results in seconds.
            </span>
          </li>
        </ul>

        <div className="mt-10 flex gap-4 flex-wrap justify-center">
          <Link
            href="/verify"
            className="px-8 py-3.5 bg-brand-600 text-white rounded-lg font-semibold text-lg hover:bg-brand-500 transition shadow-lg shadow-brand-600/20"
          >
            Verify Your First Claim Free
          </Link>
          <Link
            href="/trust"
            className="px-8 py-3.5 border border-slate-700 text-slate-300 rounded-lg font-medium hover:border-slate-500 hover:text-white transition"
          >
            See How It Works
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Free to start — no credit card required
        </p>

        {/* Live counter */}
        {showCounter && (
          <div className="mt-10 counter-animate flex items-center gap-8 rounded-xl border border-surface-800/60 bg-surface-900/60 px-8 py-5">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{formatNumber(stats.totalClaims)}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">claims verified</p>
            </div>
            <div className="h-8 w-px bg-slate-700/50" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{formatNumber(stats.totalPacks)}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">reports generated</p>
            </div>
          </div>
        )}
      </section>

      {/* Differentiators */}
      <section className="px-6 py-20 border-t border-surface-800/60">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-heading font-semibold text-center mb-12 text-white">
            Not another &quot;AI detector.&quot; A real verification engine.
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {differentiators.map((d) => (
              <div key={d.label} className="text-center space-y-2">
                <p className="text-lg font-semibold text-brand-400">{d.label}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="px-6 py-20 bg-surface-900">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-display-sm font-semibold mb-3 text-white">
            Built for people whose words matter
          </h2>
          <p className="text-slate-400">
            If your reputation depends on being right, Factward is your safety net.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((uc) => (
            <div
              key={uc.title}
              className="rounded-xl border border-surface-800/60 bg-surface-950/50 p-6 space-y-3 hover:border-slate-600 transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-400">
                {uc.icon}
              </div>
              <h3 className="font-semibold text-white">{uc.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Score showcase */}
      <section className="px-6 py-20 border-t border-surface-800/60">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-display-sm font-semibold mb-3 text-white">
            Shareable proof, not just a promise
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-10">
            Every check produces a Trust Score report with claim-by-claim evidence
            you can share with editors, clients, or your audience. Embed the badge on
            your site.
          </p>
          <div className="inline-flex items-center gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 px-6 py-4">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="text-brand-500">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-semibold text-brand-400">
              Verified by Factward — 87% Trust Score
            </span>
            <span className="ml-2 flex items-center gap-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-green-400 font-medium">Fresh</span>
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Embed a live badge on your site — auto-updates with trust score and freshness
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center bg-surface-900">
        <h2 className="text-display-sm font-semibold mb-3 text-white">
          Stop guessing. Start verifying.
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto mb-10">
          Create a free account, paste your first text, and get a source-backed
          verification report in under a minute. Upgrade when you need more.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/signup"
            className="px-8 py-3.5 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-500 transition shadow-lg shadow-brand-600/20"
          >
            Create Free Account
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-3.5 border border-slate-700 text-slate-300 rounded-lg font-medium hover:border-slate-500 hover:text-white transition"
          >
            See Pricing
          </Link>
        </div>
        <p className="mt-8 text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
