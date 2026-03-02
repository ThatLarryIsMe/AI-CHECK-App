"use client";
import { FormEvent, useEffect, useState } from "react";
import { VERSION } from "@/../../version";

interface StatsData {
  total_jobs: number;
  total_packs: number;
  total_waitlist_signups: number;
  last_24h_jobs: number;
  avg_claims_per_pack: number;
}

interface HealthData {
  version: string;
  totalJobsToday: number;
  avgDurationMs: number;
  timeoutRate: number;
  retrievalRate: number;
}

type LoadState = "idle" | "loading" | "ready" | "error";

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-slate-100"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function AdminReportPage() {
  const [keyInput, setKeyInput] = useState("");
  const [betaKey, setBetaKey] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  async function fetchReport(key: string) {
    setLoadState("loading");
    setErrorMsg(null);
    try {
      const headers = { "x-proofmode-key": key };
      const [statsRes, healthRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/health", { headers }),
      ]);
      if (!statsRes.ok || !healthRes.ok) {
        const errData = (await (!statsRes.ok ? statsRes : healthRes)
          .json()
          .catch(() => ({}))) as { error?: string };
        throw new Error(errData.error ?? "Unauthorized or server error");
      }
      const [statsData, healthData] = await Promise.all([
        statsRes.json() as Promise<StatsData>,
        healthRes.json() as Promise<HealthData>,
      ]);
      setStats(statsData);
      setHealth(healthData);
      setRefreshedAt(new Date());
      setLoadState("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error");
      setLoadState("error");
    }
  }

  function handleKeySubmit(e: FormEvent) {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setBetaKey(keyInput.trim());
    void fetchReport(keyInput.trim());
  }

  function handleRefresh() {
    if (betaKey) void fetchReport(betaKey);
  }

  // Auto-refresh every 60s when report is loaded
  useEffect(() => {
    if (!betaKey || loadState !== "ready") return;
    const interval = setInterval(() => void fetchReport(betaKey), 60_000);
    return () => clearInterval(interval);
  }, [betaKey, loadState]);

  const reportDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ProofMode Admin</h1>
            <p className="mt-1 text-sm text-slate-400">
              Weekly ops report &mdash; {reportDate}
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>v{VERSION}</p>
            {refreshedAt && (
              <p className="mt-0.5">Refreshed {refreshedAt.toLocaleTimeString()}</p>
            )}
          </div>
        </div>

        {/* Key gate */}
        {!betaKey && (
          <form
            onSubmit={handleKeySubmit}
            className="rounded-lg border border-slate-800 bg-slate-900 p-6"
          >
            <label className="block text-sm font-medium text-slate-300">
              Beta access key
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Enter your <code>x-proofmode-key</code> to load the report.
            </p>
            <div className="mt-3 flex gap-3">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter key…"
                required
              />
              <button
                type="submit"
                className="rounded bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
              >
                Load Report
              </button>
            </div>
          </form>
        )}

        {/* Loading */}
        {loadState === "loading" && (
          <p className="mt-8 animate-pulse text-center text-slate-400">Loading report…</p>
        )}

        {/* Error */}
        {loadState === "error" && (
          <div className="mt-6 rounded-lg border border-red-700 bg-red-950/40 p-4">
            <p className="font-medium text-red-400">Failed to load report</p>
            <p className="mt-1 text-sm text-red-300">{errorMsg}</p>
            <button
              onClick={() => { setBetaKey(null); setLoadState("idle"); }}
              className="mt-3 text-sm text-cyan-400 underline hover:text-cyan-300"
            >
              Re-enter key
            </button>
          </div>
        )}

        {/* Report */}
        {loadState === "ready" && stats && health && (
          <div className="mt-6 space-y-8">

            {/* Refresh + version bar */}
            <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2 text-xs text-slate-500">
              <span>ProofMode <span className="text-cyan-400">{health.version}</span></span>
              <button
                onClick={handleRefresh}
                className="rounded px-2 py-1 text-slate-400 transition hover:bg-slate-800 hover:text-cyan-400"
              >
                ↺ Refresh
              </button>
            </div>

            {/* Section: Lifetime Totals */}
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Lifetime Totals</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total Jobs" value={stats.total_jobs.toLocaleString()} />
                <StatCard label="Total Packs" value={stats.total_packs.toLocaleString()} />
                <StatCard label="Waitlist Signups" value={stats.total_waitlist_signups.toLocaleString()} accent="text-cyan-400" />
                <StatCard
                  label="Avg Claims / Pack"
                  value={stats.avg_claims_per_pack.toFixed(1)}
                  sub="claims per verification"
                />
              </div>
            </section>

            {/* Section: Today */}
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Today (UTC)</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard
                  label="Jobs (24h)"
                  value={stats.last_24h_jobs.toLocaleString()}
                  accent="text-green-400"
                />
                <StatCard
                  label="Jobs Today"
                  value={health.totalJobsToday.toLocaleString()}
                  sub="since midnight UTC"
                />
                <StatCard
                  label="Avg Duration"
                  value={`${health.avgDurationMs.toLocaleString()} ms`}
                  accent={health.avgDurationMs > 8000 ? "text-red-400" : "text-slate-100"}
                  sub={health.avgDurationMs > 8000 ? "High latency" : "Nominal"}
                />
              </div>
            </section>

            {/* Section: Quality */}
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quality Signals</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Timeout Rate"
                  value={`${health.timeoutRate.toFixed(2)}%`}
                  accent={health.timeoutRate > 5 ? "text-red-400" : "text-green-400"}
                  sub={health.timeoutRate > 5 ? "Above threshold" : "Within threshold"}
                />
                <StatCard
                  label="Retrieval Rate"
                  value={`${health.retrievalRate.toFixed(2)}%`}
                  accent={health.retrievalRate > 0 ? "text-cyan-400" : "text-slate-400"}
                  sub="Evidence attached vs LLM-only"
                />
              </div>
            </section>

            {/* Weekly Summary Text block */}
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Weekly Summary Export</h2>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-300 leading-relaxed">
{`ProofMode v${health.version} — Admin Report
${reportDate}

Lifetime
  Jobs:            ${stats.total_jobs.toLocaleString()}
  Packs:           ${stats.total_packs.toLocaleString()}
  Waitlist:        ${stats.total_waitlist_signups.toLocaleString()}
  Avg claims/pack: ${stats.avg_claims_per_pack.toFixed(1)}

Today (UTC)
  Jobs (24h):      ${stats.last_24h_jobs.toLocaleString()}
  Jobs (today):    ${health.totalJobsToday.toLocaleString()}
  Avg duration:    ${health.avgDurationMs.toLocaleString()} ms

Quality
  Timeout rate:    ${health.timeoutRate.toFixed(2)}%
  Retrieval rate:  ${health.retrievalRate.toFixed(2)}%`}
              </pre>
            </section>

          </div>
        )}
      </div>
    </main>
  );
}
