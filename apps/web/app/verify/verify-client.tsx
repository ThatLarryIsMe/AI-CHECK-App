"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const HISTORY_KEY = "proofmode_history";

type HistoryEntry = {
    packId: string;
    snippet: string;
    ts: number;
};

type InputTab = "text" | "url" | "pdf";

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
    const [activeTab, setActiveTab] = useState<InputTab>("text");
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

  async function extractFromUrl(): Promise<string> {
    const res = await fetch("/api/extract-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.status === 401) {
      router.push("/login");
      throw new Error("redirect");
    }
    const data = (await res.json()) as { text?: string; error?: string };
    if (!res.ok || !data.text) {
      throw new Error(data.error ?? `Failed to extract text from URL`);
    }
    return data.text;
  }

  async function extractFromPdf(): Promise<string> {
    if (!pdfFile) throw new Error("No PDF file selected");
    const formData = new FormData();
    formData.append("file", pdfFile);
    const res = await fetch("/api/extract-pdf", {
      method: "POST",
      body: formData,
    });
    if (res.status === 401) {
      router.push("/login");
      throw new Error("redirect");
    }
    const data = (await res.json()) as { text?: string; error?: string };
    if (!res.ok || !data.text) {
      throw new Error(data.error ?? `Failed to extract text from PDF`);
    }
    return data.text;
  }

  async function onSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
          let inputText = text;

          // Extract text from URL or PDF if needed
          if (activeTab === "url") {
            inputText = await extractFromUrl();
          } else if (activeTab === "pdf") {
            inputText = await extractFromPdf();
          }

          if (!inputText.trim()) {
            throw new Error("No text to verify. Please provide some content.");
          }

          const response = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: inputText }),
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
          saveToHistory(packId, inputText);
          setHistory(loadHistory());
          router.push(`/packs/${packId}`);
        } catch (submitError) {
          if (submitError instanceof Error && submitError.message === "redirect") return;
          setError(
            submitError instanceof Error
              ? submitError.message
              : "Unexpected error — please try again."
          );
        } finally {
          setLoading(false);
        }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }
    setPdfFile(file);
    setError(null);
  }

  function removeFile() {
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const isSubmitDisabled =
    loading ||
    (activeTab === "text" && !text.trim()) ||
    (activeTab === "url" && !url.trim()) ||
    (activeTab === "pdf" && !pdfFile);

  const tabClass = (tab: InputTab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition ${
      activeTab === tab
        ? "bg-slate-800 text-cyan-400 border border-b-0 border-slate-700"
        : "text-slate-400 hover:text-slate-200"
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

                                          {/* Input tabs */}
                                          <div className="mb-0 flex gap-1">
                                            <button type="button" className={tabClass("text")} onClick={() => setActiveTab("text")}>
                                              Paste Text
                                            </button>
                                            <button type="button" className={tabClass("url")} onClick={() => setActiveTab("url")}>
                                              Enter URL
                                            </button>
                                            <button type="button" className={tabClass("pdf")} onClick={() => setActiveTab("pdf")}>
                                              Upload PDF
                                            </button>
                                          </div>

                                          <form onSubmit={onSubmit} className="space-y-4">
                                            <div className="rounded-lg rounded-tl-none border border-slate-700 bg-slate-800 p-4">
                                              {activeTab === "text" && (
                                                <textarea
                                                  className="h-40 w-full rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500"
                                                  value={text}
                                                  onChange={(e) => setText(e.target.value)}
                                                  placeholder="Paste the text you want to fact-check..."
                                                />
                                              )}

                                              {activeTab === "url" && (
                                                <div className="space-y-2">
                                                  <p className="text-sm text-slate-400">
                                                    Enter the URL of an article or webpage to fact-check.
                                                  </p>
                                                  <input
                                                    type="url"
                                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500"
                                                    value={url}
                                                    onChange={(e) => setUrl(e.target.value)}
                                                    placeholder="https://example.com/article"
                                                  />
                                                </div>
                                              )}

                                              {activeTab === "pdf" && (
                                                <div className="space-y-3">
                                                  <p className="text-sm text-slate-400">
                                                    Upload a PDF document to extract and verify its claims.
                                                  </p>
                                                  {pdfFile ? (
                                                    <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-slate-600 p-6 text-center">
                                                      <p className="text-sm text-cyan-400 font-medium">{pdfFile.name}</p>
                                                      <p className="text-xs text-slate-500 mt-1">
                                                        {(pdfFile.size / 1024).toFixed(0)} KB
                                                      </p>
                                                      <button
                                                        type="button"
                                                        className="mt-2 text-sm text-slate-400 underline hover:text-slate-200"
                                                        onClick={removeFile}
                                                      >
                                                        Remove
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-600 p-6 text-center transition hover:border-cyan-500">
                                                      <span className="text-sm text-slate-400">
                                                        Click to select a PDF file (max 5MB)
                                                      </span>
                                                      <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="application/pdf,.pdf"
                                                        className="hidden"
                                                        onChange={handleFileChange}
                                                      />
                                                    </label>
                                                  )}
                                                </div>
                                              )}
                                            </div>

                                                      <div className="flex items-center gap-4">
                                                                    <button
                                                                                      type="submit"
                                                                                      disabled={isSubmitDisabled}
                                                                                      className="rounded-lg bg-cyan-500 px-6 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                                                                                    >
                                                                      {loading ? "Checking..." : "Check facts"}
                                                                    </button>
                                                        {loading && (
                          <span className="animate-pulse text-sm text-slate-400">
                            {activeTab === "url"
                              ? "Fetching article — this may take a moment..."
                              : activeTab === "pdf"
                                ? "Extracting text from PDF..."
                                : "Analyzing claims — usually takes 10-20 seconds"}
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
