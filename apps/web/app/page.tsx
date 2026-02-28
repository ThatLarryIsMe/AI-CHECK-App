"use client";
import Link from "next/link";
import { useState } from "react";
import { VERSION } from "@/../../version";

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
        <h1 className="text-5xl font-black text-cyan-400 mb-4">
          Structured verification for professional knowledge.
        </h1>
        <p className="text-xl text-slate-300 max-w-3xl mb-8">
          Turn any text into a claim-level assessment with transparent reasoning
          and exportable artifacts.
        </p>
        <ul className="text-slate-200 text-left max-w-xl w-full space-y-3 mb-6">
          <li>•&nbsp; Extracts factual claims automatically</li>
          <li>•&nbsp; Classifies each claim conservatively</li>
          <li>•&nbsp; Produces a shareable verification report</li>
        </ul>
        <p className="text-slate-400 mb-8">Built for analysts, consultants, and agencies.</p>
        <div className="flex gap-4">
          <Link href="/verify" className="px-6 py-3 bg-cyan-500 text-slate-950 rounded-lg font-semibold hover:bg-cyan-400">
            Try the demo
          </Link>
          <a href="#waitlist" className="px-6 py-3 border border-slate-600 text-slate-300 rounded-lg hover:border-slate-400">
            Get early access
          </a>
        </div>
      </section>

      <section id="waitlist" className="px-6 py-16 bg-slate-900 text-center">
        <h2 className="text-2xl font-bold mb-4">Get early access</h2>
        <p className="text-slate-400 max-w-xl mx-auto mb-8">
          We&apos;re rolling out to a small group first. Drop your email and we&apos;ll notify you when your spot opens.
        </p>
        {submitted ? (
          <p className="text-cyan-400 font-semibold">You&apos;re on the list! We&apos;ll be in touch.</p>
        ) : (
          <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button type="submit" className="px-6 py-3 bg-cyan-500 text-slate-950 rounded-lg font-semibold hover:bg-cyan-400">
              Notify me
            </button>
          </form>
        )}
        {error && <p className="text-red-400 mt-3">{error}</p>}
      </section>

      <footer className="px-6 py-6 text-center text-slate-500 text-sm flex items-center justify-center gap-4">
        <span>ProofMode v{VERSION}</span>
        <Link href="/trust" className="hover:text-slate-300">&nbsp;Trust &amp; methodology</Link>
      </footer>
    </main>
  );
}
