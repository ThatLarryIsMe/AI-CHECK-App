"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordStrength = password.length === 0
    ? null
    : password.length < 8
      ? "weak"
      : password.length < 12
        ? "fair"
        : "strong";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, inviteCode }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Signup failed");
        return;
      }
      // Full page reload so the server layout re-reads the session cookie
      window.location.href = "/verify";
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
          <div className="mb-4 flex justify-center">
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" className="text-brand-500">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white">Join Factward</h1>
          <p className="mt-2 text-sm text-slate-400">
            Start verifying claims with real sources in under a minute
          </p>
        </div>

        <div className="rounded-xl border border-surface-800/60 bg-surface-900 p-8">
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
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="8 characters minimum"
                  className="w-full rounded-lg border border-surface-800/60 bg-surface-950 px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 2l12 12M6.5 6.5a2 2 0 002.8 2.8M4.2 4.2C3 5.1 2 6.4 2 8c1.5 4 3.5 5 6 5 1.2 0 2.3-.3 3.2-.9M8 3c2.5 0 4.5 1 6 5-.4 1.1-1 2-1.6 2.7" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 8c1.5-4 3.5-5 6-5s4.5 1 6 5c-1.5 4-3.5 5-6 5s-4.5-1-6-5z" />
                      <circle cx="8" cy="8" r="2" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Password strength */}
              {passwordStrength && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    <div className={`h-1 flex-1 rounded-full ${
                      passwordStrength === "weak" ? "bg-red-500" : "bg-brand-500"
                    }`} />
                    <div className={`h-1 flex-1 rounded-full ${
                      passwordStrength === "weak" ? "bg-slate-700" : "bg-brand-500"
                    }`} />
                    <div className={`h-1 flex-1 rounded-full ${
                      passwordStrength === "strong" ? "bg-brand-500" : "bg-slate-700"
                    }`} />
                  </div>
                  <span className={`text-xs ${
                    passwordStrength === "weak"
                      ? "text-red-400"
                      : passwordStrength === "fair"
                        ? "text-slate-400"
                        : "text-brand-400"
                  }`}>
                    {passwordStrength === "weak" ? "Too short" : passwordStrength === "fair" ? "Fair" : "Strong"}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Invite code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                placeholder="Enter your invite code"
                className="w-full rounded-lg border border-surface-800/60 bg-surface-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Check your email for an invite code, or{" "}
                <a href="mailto:hello@factward.com" className="text-brand-400 hover:text-brand-300">
                  request one
                </a>
                .
              </p>
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          By creating an account, you agree to our terms of service and privacy policy.
        </p>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
