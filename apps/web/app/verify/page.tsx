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

export default function VerifyPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Server error ${response.status} — please try again.`);
      }
      const data = (await response.json()) as { jobId: string };
      saveToHistory(data.jobId, text);
      setHistory(loadHistory());
      router.push(`/jobs/${data.jobId}`);
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12 text-slate-100">
      <h1 className="text-3xl font-semibold text-cyan-300 mb-2">Verify text</h1>
      <p className="text-slate-400 text-sm mb-6">Paste any text — each claim will be classified and scored.</p>

      <div className="flex gap-8">
        {/* Main form */}
        <section className="flex-1">
          <form className="space-y-4" onSubmit={onSubmit}>
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
                className="rounded bg-cyan-500 px-5 py-2 font-medium text-slate-950 disabled:opacity-50 hover:bg-cyan-400 transition"
              >
                {loading ? "Submitting…" : "Run verification"}
              </button>
              {loading && (
                <span className="text-slate-400 text-sm animate-pulse">Sending to engine…</span>
              )}
            </div>
          </form>

          {/* G1.3 — Error UX */}
          {error ? (
            <div className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-4">
              <p className="text-red-400 font-medium">Something went wrong</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-3 text-sm text-cyan-400 underline hover:text-cyan-300"
              >
                Dismiss and try again
              </button>
            </div>
          ) : null}
        </section>

        {/* G1.1 — History sidebar */}
        {history.length > 0 && (
          <aside className="w-64 shrink-0">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Recent verifications</h2>
            <ul className="space-y-2">
              {history.map((entry) => (
                <li key={entry.packId}>
                  <Link
                    href={`/jobs/${entry.packId}`}
                    className="block rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700 transition"
                  >
                    <p className="text-xs text-slate-400">{new Date(entry.ts).toLocaleString()}</p>
                    <p className="text-sm text-slate-200 mt-0.5 truncate">{entry.snippet}</p>
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
