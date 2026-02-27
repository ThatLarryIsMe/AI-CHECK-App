"use client";
import { useState } from "react";

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
      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
        <h1 className="text-5xl font-black text-cyan-400 mb-4">ProofMode AI</h1>
        <p className="text-xl text-slate-300 max-w-2xl mb-8">
          Paste any text and get a structured evidence pack — every claim
          classified, scored, and export-ready in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/verify"
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition"
          >
            Try the demo
          </a>
          <a
            href="#waitlist"
            className="px-6 py-3 border border-cyan-500 hover:bg-cyan-950 text-cyan-400 font-semibold rounded-lg transition"
          >
            Get early access
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-900 py-16 px-6">
        <h2 className="text-3xl font-bold text-center mb-10">How it works</h2>
        <ul className="max-w-3xl mx-auto grid gap-6 sm:grid-cols-3 text-center">
          <li className="p-6 bg-slate-800 rounded-xl">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="font-semibold text-lg mb-2">1. Paste your text</h3>
            <p className="text-slate-400 text-sm">Any article, document, or claim set.</p>
          </li>
          <li className="p-6 bg-slate-800 rounded-xl">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-semibold text-lg mb-2">2. AI analyses it</h3>
            <p className="text-slate-400 text-sm">Each claim is classified and confidence-scored.</p>
          </li>
          <li className="p-6 bg-slate-800 rounded-xl">
            <div className="text-4xl mb-3">📄</div>
            <h3 className="font-semibold text-lg mb-2">3. Export your pack</h3>
            <p className="text-slate-400 text-sm">Download a Markdown evidence pack instantly.</p>
          </li>
        </ul>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="py-16 px-6 flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-4">Get early access</h2>
        <p className="text-slate-400 mb-8 text-center max-w-md">
          We&apos;re rolling out to a small group first. Drop your email and
          we&apos;ll notify you when your spot opens.
        </p>
        {submitted ? (
          <p className="text-cyan-400 font-semibold text-lg">You&apos;re on the list! We&apos;ll be in touch.</p>
        ) : (
          <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition"
            >
              Notify me
            </button>
          </form>
        )}
        {error && <p className="text-red-400 mt-3">{error}</p>}
      </section>

      <footer className="py-6 text-center text-slate-600 text-sm">
        &copy; {new Date().getFullYear()} ProofMode AI — LLM-only mode
      </footer>
    </main>
  );
}
