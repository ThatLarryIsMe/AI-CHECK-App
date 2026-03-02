"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const HISTORY_KEY = "proofmode_history";

type HistoryEntry = {
    packId: string;
    snippet: string;
    ts: number;
};

function loadHistory(): HistoryEntry[] {
    if (typeof window === "undefined") return [];
    try {
          return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as HistoryEntry[];
    } catch {
          return [];
    }
}

function saveToHistory(packId: string, snippet: string) {
    const prev = loadHistory();
    const updated: HistoryEntry[] = [
      { packId, snippet: snippet.slice(0, 80), ts: Date.now() },
          ...prev.filter((e) => e.packId !== packId),
        ].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function VerifyClient({ plan = "free", planStatus = "inactive" }: { plan?: string; planStatus?: string }) {
    const router = useRouter();
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
        setHistory(loadHistory());
  }, []);

  const isPro = plan === "pro" && planStatus === "active";
         const dailyLimit = isPro ? 200 : 10;

  async function onSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
                setError(null);
        try {
        const response = await fetch("/api/verify", {
                                      method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text }),
        });
                if (response.status === 401) {
                          router.push("/login");
                          return;
                }
                if (!response.ok) {
                            const data = (await response.json().catch(() => ({}))) as { error?: string };
                          throw new Error(data.error ?? `Server error ${response.status} — please try again.`);
                }
                const data = (await response.json()) as { jobId: string; packId?: string };
                const packId = data.packId ?? data.jobId;
                saveToHistory(packId, text);
                setHistory(loadHistory());
                router.push(`/packs/${packId}`);
        } catch (submitError) {
                setError(
                          submitError instanceof Error
                            ? submitError.message
                            : "Unexpected error — please try again."
                        );
        } finally {
                setLoading(false);
        }
  }

  return (
        <main className="flex min-h-screen flex-col items-center bg-slate-950 px-4 py-16 text-slate-100">
                        <div className="flex w-full max-w-4xl gap-8">
                                <section className="flex-1">
                                          <h1 className="mb-1 text-3xl font-bold text-white">Check any claim</h1>
                                          <p className="mb-5 text-slate-400">
                                            Paste an article, social post, or any text with factual claims.
                                            We&apos;ll break it down and verify each one.
                                          </p>

                                  {/* How it works */}
                                          <div className="mb-5 rounded-lg bg-slate-900 border border-slate-700 p-4 text-sm text-slate-400 space-y-2">
                                                      <p className="font-semibold text-slate-300">What you&apos;ll get back:</p>
                                                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                          <span><span className="text-green-400 font-medium">Supported</span> — evidence backs the claim</span>
                                                          <span><span className="text-yellow-400 font-medium">Mixed</span> — partial or conflicting evidence</span>
                                                          <span><span className="text-red-400 font-medium">Unsupported</span> — no evidence found</span>
                                                      </div>
                                                      <p className="text-xs text-slate-500">Results are saved automatically and appear in your recent verifications.</p>
                                          </div>

                                  {/* Plan usage note */}
                                          <div className="mb-5 flex items-center gap-2 text-xs text-slate-500">
                                                      <span>
                                                        {isPro ? "Pro" : "Free"}: {dailyLimit} checks / day
                                                      </span>
                                            {!isPro && (
                        <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300 underline">
                                        Need more?
                        </Link>
                                                      )}
                                          </div>

                                          <form onSubmit={onSubmit} className="space-y-4">
                                                      <textarea
                                                                      className="h-48 w-full rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500"
                                                                      value={text}
                                                                      onChange={(event) => setText(event.target.value)}
              placeholder="Paste the text you want to fact-check..."
                                                                      required
                                                                    />
                                                      <div className="flex items-center gap-4">
                                                                    <button
                                                                                      type="submit"
                                                                                      disabled={loading}
                                                                                      className="rounded-lg bg-cyan-500 px-6 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                                                                                    >
                                                                      {loading ? "Checking..." : "Check facts"}
                                                                    </button>
                                                        {loading && (
                          <span className="animate-pulse text-sm text-slate-400">Analyzing claims — usually takes 10-20 seconds</span>
                                                                    )}
                                                      </div>
                                          </form>

                                  {error ? (
                      <div className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-4">
                                    <p className="font-medium text-red-400">Something went wrong</p>
                                    <p className="mt-1 text-sm text-red-300">{error}</p>
                                    <button
                                                      onClick={() => setError(null)}
                                                      className="mt-3 text-sm text-cyan-400 underline hover:text-cyan-300"
                                                    >
                                                    Dismiss and try again
                                    </button>
                      </div>
                    ) : null}
                                      </section>

                          {history.length > 0 && (
                    <aside className="w-64 shrink-0">
                                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                                              Recent checks
                                </h2>
                                <ul className="space-y-2">
                                  {history.map((entry) => (
                                      <li key={entry.packId}>
                                                        <Link
                                                                              href={`/packs/${entry.packId}`}
                                                                              className="block rounded-lg bg-slate-800 px-3 py-2 transition hover:bg-slate-700"
                                                                            >
                                                                            <p className="text-xs text-slate-500">{new Date(entry.ts).toLocaleString()}</p>
                                                                              <p className="mt-0.5 truncate text-sm text-slate-200">{entry.snippet}</p>
                                                        </Link>
                                      </li>
                                    ))}
                                </ul>
                    </aside>
                                )}
                        </div>
        </main>
      );
}
