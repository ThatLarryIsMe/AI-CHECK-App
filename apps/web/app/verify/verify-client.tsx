"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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

type InputMode = "text" | "url" | "pdf";

export function VerifyClient({ plan = "free", planStatus = "inactive" }: { plan?: string; planStatus?: string }) {
    const router = useRouter();
    const [mode, setMode] = useState<InputMode>("text");
    const [text, setText] = useState("");
    const [url, setUrl] = useState("");
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
        setHistory(loadHistory());
  }, []);

  const isPro = plan === "pro" && planStatus === "active";
  const dailyLimit = isPro ? 200 : 10;

  function snippet(): string {
    if (mode === "url") return url.slice(0, 80);
    if (mode === "pdf") return pdfFile?.name.slice(0, 80) ?? "PDF upload";
    return text.slice(0, 80);
  }

  function canSubmit(): boolean {
    if (loading) return false;
    if (mode === "text") return text.trim().length > 0;
    if (mode === "url") return url.trim().length > 0;
    if (mode === "pdf") return pdfFile !== null;
    return false;
  }

  async function onSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
        let response: Response;

        if (mode === "pdf" && pdfFile) {
          const formData = new FormData();
          formData.append("file", pdfFile);
          response = await fetch("/api/verify", { method: "POST", body: formData });
        } else if (mode === "url") {
          response = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
        } else {
          response = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
        }

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
        saveToHistory(packId, snippet());
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

  const tabClass = (t: InputMode) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition ${
      mode === t
        ? "bg-slate-800 text-cyan-400 border border-b-0 border-slate-700"
        : "text-slate-500 hover:text-slate-300"
    }`;

  return (
        <main className="flex min-h-screen flex-col items-center bg-slate-950 px-4 py-16 text-slate-100">
          <div className="flex w-full max-w-4xl gap-8">
            <section className="flex-1">
              <h1 className="mb-1 text-3xl font-bold text-white">Check any claim</h1>
              <p className="mb-5 text-slate-400">
                Paste text, enter a URL, or upload a PDF — we&apos;ll break it down and verify each claim.
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

              {/* Tab bar */}
              <div className="flex gap-1 mb-0">
                <button type="button" className={tabClass("text")} onClick={() => setMode("text")}>
                  Paste Text
                </button>
                <button type="button" className={tabClass("url")} onClick={() => setMode("url")}>
                  Enter URL
                </button>
                <button type="button" className={tabClass("pdf")} onClick={() => setMode("pdf")}>
                  Upload PDF
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4 rounded-b-lg rounded-tr-lg border border-slate-700 bg-slate-800 p-4">
                {mode === "text" && (
                  <textarea
                    className="h-48 w-full rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste the text you want to fact-check..."
                  />
                )}

                {mode === "url" && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">Enter the URL of an article or webpage to fact-check.</p>
                    <input
                      type="url"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/article"
                    />
                  </div>
                )}

                {mode === "pdf" && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">Upload a PDF document to extract and verify its claims.</p>
                    <div
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-900 p-8 cursor-pointer hover:border-cyan-500 transition"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {pdfFile ? (
                        <div className="text-center">
                          <p className="text-sm text-cyan-400 font-medium">{pdfFile.name}</p>
                          <p className="text-xs text-slate-500 mt-1">{(pdfFile.size / 1024).toFixed(0)} KB</p>
                          <button
                            type="button"
                            className="mt-2 text-xs text-slate-400 underline hover:text-red-400"
                            onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm text-slate-400">Click to select a PDF file</p>
                          <p className="text-xs text-slate-600 mt-1">Max 10 MB</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f && f.type === "application/pdf") setPdfFile(f);
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={!canSubmit()}
                    className="rounded-lg bg-cyan-500 px-6 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {loading ? "Checking..." : "Check facts"}
                  </button>
                  {loading && (
                    <span className="animate-pulse text-sm text-slate-400">
                      {mode === "url" ? "Fetching article & analyzing claims..." : mode === "pdf" ? "Extracting text & analyzing claims..." : "Analyzing claims — usually takes 10-20 seconds"}
                    </span>
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
