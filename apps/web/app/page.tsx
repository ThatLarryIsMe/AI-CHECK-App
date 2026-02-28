import Link from "next/link";
import { VERSION } from "@/../../version";

// Phase P4: Rewritten home page — plain English copy, invite-only beta
export default function Home() {
    return (
          <main className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Hero */}
                <section className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
                        <h1 className="text-5xl font-black text-cyan-400 mb-4">
                                  Turn Any Claim Into a Verification Report
                        </h1>h1>
                        <p className="text-xl text-slate-300 max-w-2xl mb-8">
                                  Paste text. We extract factual claims, evaluate them conservatively,
                                  and attach evidence when available.
                        </p>p>
                        <ul className="text-slate-200 text-left max-w-xl w-full space-y-3 mb-10">
                                  <li className="flex items-start gap-2">
                                              <span className="text-cyan-400 font-bold mt-0.5">&#10003;</span>span>
                                              Extracts factual claims automatically
                                  </li>li>
                                  <li className="flex items-start gap-2">
                                              <span className="text-cyan-400 font-bold mt-0.5">&#10003;</span>span>
                                              Labels each claim: Supported, Mixed, or Unsupported
                                  </li>li>
                                  <li className="flex items-start gap-2">
                                              <span className="text-cyan-400 font-bold mt-0.5">&#10003;</span>span>
                                              Produces a shareable verification report
                                  </li>li>
                        </ul>ul>
                        <div className="flex gap-4 flex-wrap justify-center">
                                  <Link
                                                href="/verify"
                                                className="px-6 py-3 bg-cyan-500 text-slate-950 rounded-lg font-semibold hover:bg-cyan-400 transition"
                                              >
                                              Start Verifying
                                  </Link>Link>
                                  <Link
                                                href="/trust"
                                                className="px-6 py-3 border border-slate-600 text-slate-300 rounded-lg hover:border-slate-400 transition"
                                              >
                                              See How It Works
                                  </Link>Link>
                        </div>div>
                </section>section>
          
            {/* Invite-only beta */}
                <section className="px-6 py-16 bg-slate-900 text-center">
                        <h2 className="text-2xl font-bold mb-3">Invite-only beta</h2>h2>
                        <p className="text-slate-400 max-w-xl mx-auto mb-6">
                                  ProofMode is currently invite-only. If you have an invite code,
                                  create your account now and start verifying immediately.
                        </p>p>
                        <Link
                                    href="/signup"
                                    className="inline-block px-6 py-3 bg-cyan-500 text-slate-950 rounded-lg font-semibold hover:bg-cyan-400 transition"
                                  >
                                  Create an account
                        </Link>Link>
                        <p className="mt-4 text-sm text-slate-500">
                                  Already have an account?{" "}
                                  <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
                                              Log in
                                  </Link>Link>
                        </p>p>
                </section>section>
          
                <footer className="px-6 py-6 text-center text-slate-500 text-sm flex items-center justify-center gap-4">
                        <span>ProofMode v{VERSION}</span>span>
                        <Link href="/trust" className="hover:text-slate-300">
                                  Trust &amp; methodology
                        </Link>Link>
                </footer>footer>
          </main>main>
        );
}</main>
