import Link from "next/link";
import { VERSION } from "@/../../version";

export default function Home() {
    return (
          <main className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Hero */}
                <section className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
                        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-cyan-400">
                            AI-powered fact checking
                        </p>
                        <h1 className="text-5xl sm:text-6xl font-black text-white mb-6 max-w-3xl leading-tight">
                            Know what&apos;s true <span className="text-cyan-400">before you share it</span>
                        </h1>
                        <p className="text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed">
                            Paste any article, post, or claim. ProofMode breaks it down into individual facts,
                            checks each one against real sources, and gives you a clear, shareable report
                            in seconds.
                        </p>
                        <ul className="text-slate-200 text-left max-w-xl w-full space-y-4 mb-12">
                                  <li className="flex items-start gap-3">
                                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">&#10003;</span>
                                              <span><strong className="text-white">Automatic claim extraction</strong> — AI identifies every factual statement so nothing slips through</span>
                                  </li>
                                  <li className="flex items-start gap-3">
                                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">&#10003;</span>
                                              <span><strong className="text-white">Evidence-backed verdicts</strong> — each claim is rated Supported, Mixed, or Unsupported with sources</span>
                                  </li>
                                  <li className="flex items-start gap-3">
                                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">&#10003;</span>
                                              <span><strong className="text-white">One-click sharing</strong> — send a verification report to your team, audience, or editor</span>
                                  </li>
                        </ul>
                        <div className="flex gap-4 flex-wrap justify-center">
                                  <Link
                                                href="/verify"
                                                className="px-8 py-3.5 bg-cyan-500 text-slate-950 rounded-lg font-bold text-lg hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/25"
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
                </section>

            {/* Social proof / use cases */}
                <section className="px-6 py-16 border-t border-slate-800">
                    <div className="max-w-4xl mx-auto grid gap-8 sm:grid-cols-3 text-center">
                        <div>
                            <p className="text-3xl font-bold text-cyan-400 mb-2">10s</p>
                            <p className="text-slate-400 text-sm">Average time to verify a full article</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-cyan-400 mb-2">Claim-level</p>
                            <p className="text-slate-400 text-sm">Every individual fact is checked, not just headlines</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-cyan-400 mb-2">Transparent</p>
                            <p className="text-slate-400 text-sm">See the evidence and reasoning behind every verdict</p>
                        </div>
                    </div>
                </section>

            {/* Who it's for */}
                <section className="px-6 py-16 bg-slate-900">
                    <div className="max-w-3xl mx-auto text-center mb-10">
                        <h2 className="text-3xl font-bold mb-3">Built for people who care about accuracy</h2>
                        <p className="text-slate-400">Whether you&apos;re reporting a story, reviewing research, or just trying to cut through the noise.</p>
                    </div>
                    <div className="max-w-4xl mx-auto grid gap-6 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="font-semibold text-white mb-2">Journalists &amp; Editors</h3>
                            <p className="text-sm text-slate-400">Verify sources and claims before publication. Share structured reports with your editorial team.</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="font-semibold text-white mb-2">Researchers &amp; Analysts</h3>
                            <p className="text-sm text-slate-400">Quickly assess the factual basis of papers, reports, or public statements with evidence trails.</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="font-semibold text-white mb-2">Content Creators</h3>
                            <p className="text-sm text-slate-400">Make sure what you share is accurate. Build trust with your audience by fact-checking yourself first.</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="font-semibold text-white mb-2">Curious Minds</h3>
                            <p className="text-sm text-slate-400">See a claim that seems too good to be true? Paste it in and find out in seconds.</p>
                        </div>
                    </div>
                </section>

            {/* CTA — Invite-only beta */}
                <section className="px-6 py-20 text-center">
                        <h2 className="text-3xl font-bold mb-3">Join the beta</h2>
                        <p className="text-slate-400 max-w-xl mx-auto mb-8">
                            ProofMode is currently in private beta. Got an invite code?
                            Create your account and start verifying in under a minute.
                        </p>
                        <div className="flex gap-4 flex-wrap justify-center">
                            <Link
                                        href="/signup"
                                        className="px-8 py-3 bg-cyan-500 text-slate-950 rounded-lg font-bold hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/25"
                                      >
                                      Create Your Account
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
                </footer>
          </main>
        );
}
