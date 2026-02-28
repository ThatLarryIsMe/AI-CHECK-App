"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// P2.2: betaKey prop removed — end users authenticate via session, not x-proofmode-key header.

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

export function VerifyClient() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // P2.2: session cookie is sent automatically; no x-proofmode-key header needed.
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.status === 401) {
        // Session expired — redirect to login
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Server error ${response.status} — please try again.`);
      }

      const data = (await response.json()) as { jobId: string };
      let packId = data.jobId;
      try {
        const jobRes = await fetch(`/api/jobs/${data.jobId}`);
        if (jobRes.ok) {
          const jobData = (await jobRes.json()) as { status: string; packId?: string };
          if (jobData.packId) packId = jobData.packId;
        }
      } catch {
        // fall back to jobId if poll fails
      }
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
          <h1 className="mb-2 text-2xl font-bold text-white">Verify text</h1>
          <p className="mb-6 text-slate-400">
            Paste any text — each claim will be classified and scored.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <textarea
              className="h-48 w-full rounded-lg border border-slate-700 bg-slate-900 p-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste text with claims to verify"
              required
            />
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-cyan-500 px-5 py-2 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {loading ? "Submitting…" : "Run verification"}
              </button>
              {loading && (
                <span className="animate-pulse text-sm text-slate-400">Sending to engine…</span>
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
              Recent verifications
            </h2>
            <ul className="space-y-2">
              {history.map((entry) => (
                <li key={entry.packId}>
                  <Link
                    href={`/packs/${entry.packId}`}
                    className="block rounded-lg bg-slate-800 px-3 py-2 transition hover:bg-slate-700"
                  >
                    <p className="text-xs text-slate-400">{new Date(entry.ts).toLocaleString()}</p>
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
