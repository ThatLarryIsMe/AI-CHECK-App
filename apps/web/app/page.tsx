import Link from "next/link";
import { VERSION } from "@/../../version";
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

export default async function Home() {
    const stats = await getGlobalStats();
    const showCounter = stats.totalClaims > 0;

    return (
          <main className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Hero */}
                <section className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
                        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-cyan-400">
                            AI-powered claim verification
                        </p>
                        <h1 className="text-5xl sm:text-6xl font-black text-white mb-6 max-w-3xl leading-tight">
                            Know what&apos;s true <span className="text-cyan-400">before you share it</span>
                        </h1>
                        <p className="text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed">
                            Paste text, drop a URL, or upload a PDF. ProofMode extracts every factual claim,
                            verifies each one against real sources, and delivers a shareable Trust Score
                            report — all in seconds.
                        </p>
                        <ul className="text-slate-200 text-left max-w-xl w-full space-y-4 mb-12">
                                  <li className="flex items-start gap-3">
                                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">&#10003;</span>
                                              <span><strong className="text-white">Claim-level analysis</strong> — not site ratings. Every individual factual statement is extracted and verified independently</span>
                                  </li>
                                  <li className="flex items-start gap-3">
                                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">&#10003;</span>
                                              <span><strong className="text-white">Evidence you can see</strong> — each claim is rated Supported, Mixed, or Unsupported with linked sources and confidence scores</span>
                                  </li>
                                  <li className="flex items-start gap-3">
                                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">&#10003;</span>
                                              <span><strong className="text-white">Trust Score reports</strong> — shareable verification reports with an embeddable trust badge for your website</span>
                                  </li>
                                  <li className="flex items-start gap-3">
                                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">&#10003;</span>
                                              <span><strong className="text-white">Any format</strong> — paste text, enter a URL, or upload a PDF. Check news articles, AI-generated content, research papers, social posts</span>
                                  </li>
                        </ul>
                        <div className="flex gap-4 flex-wrap justify-center">
                                  <Link
                                                href="/verify"
                                                className="glow-cta px-8 py-3.5 bg-cyan-500 text-slate-950 rounded-lg font-bold text-lg hover:bg-cyan-400 transition"
                                              >
                                              Start Checking Facts
                                  </Link>
                                  <Link
                                                href="/trust"
                                                className="px-8 py-3.5 border border-slate-600 text-slate-300 rounded-lg font-medium hover:border-slate-400 hover:text-white transition"
                                              >
                                              How It Works
                                  </Link>
                        </div>
                        <p className="mt-6 text-sm text-slate-500">
                            Free to use — no credit card required
                        </p>

                        {/* Live counter */}
                        {showCounter && (
                            <div className="mt-8 counter-animate flex items-center gap-6 rounded-xl border border-slate-800 bg-slate-900/60 px-8 py-4">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-cyan-400">{formatNumber(stats.totalClaims)}</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">claims verified</p>
                                </div>
                                <div className="h-8 w-px bg-slate-700" />
                                <div className="text-center">
                                    <p className="text-2xl font-black text-white">{formatNumber(stats.totalPacks)}</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">reports generated</p>
                                </div>
                            </div>
                        )}
                </section>

            {/* How it compares */}
                <section className="px-6 py-16 border-t border-slate-800">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold text-center mb-10">
                            Why ProofMode is different
                        </h2>
                        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-center">
                            <div>
                                <p className="text-3xl font-bold text-cyan-400 mb-2">Claim-level</p>
                                <p className="text-slate-400 text-sm">
                                    Other tools rate entire websites. ProofMode checks every individual claim
                                    with its own evidence and verdict.
                                </p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-cyan-400 mb-2">Transparent</p>
                                <p className="text-slate-400 text-sm">
                                    See the sources, confidence scores, and reasoning behind every verdict.
                                    No black boxes.
                                </p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-cyan-400 mb-2">Nuanced</p>
                                <p className="text-slate-400 text-sm">
                                    Three-tier verdicts (Supported, Mixed, Unsupported) handle ambiguity honestly
                                    instead of forcing binary true/false.
                                </p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-cyan-400 mb-2">Time-aware</p>
                                <p className="text-slate-400 text-sm">
                                    Facts have a shelf life. ProofMode tracks claim freshness and alerts you
                                    when your verifications need updating. No one else does this.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

            {/* Use cases */}
                <section className="px-6 py-16 bg-slate-900">
                    <div className="max-w-3xl mx-auto text-center mb-10">
                        <h2 className="text-3xl font-bold mb-3">Check anything with claims</h2>
                        <p className="text-slate-400">Whether you&apos;re verifying news, reviewing AI output, or fact-checking before you publish.</p>
                    </div>
                    <div className="max-w-4xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="font-semibold text-white mb-2">News Articles</h3>
                            <p className="text-sm text-slate-400">Drop a URL and get every claim verified with sources before you share or cite.</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="font-semibold text-white mb-2">AI-Generated Content</h3>
                            <p className="text-sm text-slate-400">Paste ChatGPT or Claude output to catch hallucinations and verify factual accuracy.</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="font-semibold text-white mb-2">Research Papers</h3>
                            <p className="text-sm text-slate-400">Upload a PDF to verify cited statistics, dates, and factual claims in academic work.</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="font-semibold text-white mb-2">Social Media Posts</h3>
                            <p className="text-sm text-slate-400">Copy any viral post and get the facts checked before it spreads further.</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="font-semibold text-white mb-2">Your Own Writing</h3>
                            <p className="text-sm text-slate-400">Fact-check yourself before publishing. Build credibility with a &quot;Verified by ProofMode&quot; badge.</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="font-semibold text-white mb-2">Press Releases</h3>
                            <p className="text-sm text-slate-400">Verify claims in corporate communications, investor materials, and PR statements.</p>
                        </div>
                    </div>
                </section>

            {/* Trust Score showcase */}
                <section className="px-6 py-16 border-t border-slate-800">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-3">Every check gets a Trust Score</h2>
                        <p className="text-slate-400 max-w-xl mx-auto mb-8">
                            Your verification reports include a visual Trust Score, claim-by-claim breakdowns,
                            and evidence links. Share them anywhere — embed on your site, post to social media,
                            or send to your team.
                        </p>
                        <div className="inline-flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-6 py-4">
                            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" stroke="#22d3ee" strokeWidth="1.5" />
                                <path d="M5 8l2 2 4-4" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="font-bold text-cyan-400">Verified by ProofMode — 87% Trust Score</span>
                            <span className="ml-2 flex items-center gap-1 text-xs">
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-green-400 font-medium">Fresh</span>
                            </span>
                        </div>
                        <p className="mt-4 text-xs text-slate-500">
                            Embed a live badge on any website — auto-updates with trust score and freshness
                        </p>
                    </div>
                </section>

            {/* CTA */}
                <section className="px-6 py-20 text-center bg-slate-900">
                        <h2 className="text-3xl font-bold mb-3">Start verifying in 30 seconds</h2>
                        <p className="text-slate-400 max-w-xl mx-auto mb-8">
                            Create a free account and get 10 verifications per day.
                            No credit card required. Upgrade anytime for more checks and deeper analysis.
                        </p>
                        <div className="flex gap-4 flex-wrap justify-center">
                            <Link
                                        href="/signup"
                                        className="px-8 py-3 bg-cyan-500 text-slate-950 rounded-lg font-bold hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/25"
                                      >
                                      Create Free Account
                            </Link>
                            <Link
                                        href="/pricing"
                                        className="px-8 py-3 border border-slate-600 text-slate-300 rounded-lg font-medium hover:border-slate-400 hover:text-white transition"
                                      >
                                      See Pricing
                            </Link>
                        </div>
                        <p className="mt-6 text-sm text-slate-500">
                                  Already have an account?{" "}
                                  <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
                                              Sign in
                                  </Link>
                        </p>
                </section>

                <footer className="px-6 py-6 border-t border-slate-800 text-center text-slate-500 text-sm flex items-center justify-center gap-6">
                        <span>ProofMode v{VERSION}</span>
                        <Link href="/trust" className="hover:text-slate-300">
                                  Trust &amp; Methodology
                        </Link>
                        <Link href="/pricing" className="hover:text-slate-300">
                                  Pricing
                        </Link>
                        <Link href="/tools" className="hover:text-slate-300">
                                  Tools
                        </Link>
                </footer>
          </main>
        );
}
