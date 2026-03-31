"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-400">
            {submitted
              ? "Check your inbox for a reset link."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        <div className="rounded-xl border border-surface-800/60 bg-surface-900 p-8">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-400">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <p className="text-sm text-slate-300">
                If an account exists for <span className="font-medium text-white">{email}</span>, you&apos;ll receive an email with instructions to reset your password.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block text-sm text-brand-400 hover:text-brand-300 transition"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-surface-800/60 bg-surface-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
              {error && (
                <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Remember your password?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
