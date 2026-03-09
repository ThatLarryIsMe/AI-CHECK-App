"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

const STEPS = ["Extracting text", "Analyzing claims", "Verifying facts", "Building report"];

export function VerifyClient({ plan = "free", planStatus = "inactive", role = "user" }: { plan?: string; planStatus?: string; role?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<InputTab>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
    const urlParam = searchParams.get("url");
    if (urlParam) {
      setActiveTab("url");
      setUrl(urlParam);
    }
  }, [searchParams]);

  // Animate loading steps
  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  const isPro = plan === "pro" && planStatus === "active";
  const isAdmin = role === "admin";
  const dailyLimit = isAdmin ? Infinity : isPro ? 200 : 2;
  const charLimit = isPro || isAdmin ? 15000 : 5000;

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
    setLoadingStep(0);
    try {
      let inputText = text;

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
      router.push(`/report/${packId}`);
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setError(null);
    } else {
      setError("Please drop a PDF file.");
    }
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

  const tabs: { key: InputTab; label: string }[] = [
    { key: "text", label: "Paste Text" },
    { key: "url", label: "Enter URL" },
    { key: "pdf", label: "Upload PDF" },
  ];

  return (
    <main className="flex flex-col items-center px-4 py-12 md:py-16">
      <div className="flex w-full max-w-5xl flex-col lg:flex-row gap-8">
        <section className="flex-1 min-w-0">
          <h1 className="mb-1 text-display-sm font-semibold text-white">Check any claim</h1>
          <p className="mb-6 text-slate-400">
            Paste text, enter a URL, or upload a PDF — we&apos;ll break it down and verify
            each claim.
          </p>

          {/* Plan usage */}
          <div className="mb-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-800/60 px-3 py-1">
              {isAdmin ? "Admin" : isPro ? "Pro" : "Free"}: {isAdmin ? "unlimited" : dailyLimit} checks / day
            </span>
            {!isPro && (
              <Link href="/pricing" className="text-brand-400 hover:text-brand-300">
                Need more?
              </Link>
            )}
          </div>

          {/* Input tabs — segmented control */}
          <div className="mb-0 inline-flex rounded-lg bg-surface-800/60 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                  activeTab === tab.key
                    ? "bg-surface-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-3 space-y-4">
            <div className="rounded-xl border border-surface-800/60 bg-surface-900 p-4">
              {activeTab === "text" && (
                <div className="relative">
                  <textarea
                    className="min-h-[160px] w-full resize-y rounded-lg border border-surface-800/60 bg-surface-950 p-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 placeholder:text-slate-600"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste the text you want to fact-check..."
                    maxLength={charLimit}
                  />
                  <span className="absolute bottom-3 right-3 text-xs text-slate-600">
                    {text.length.toLocaleString()} / {charLimit.toLocaleString()}
                  </span>
                </div>
              )}

              {activeTab === "url" && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">
                    Enter the URL of an article or webpage to fact-check.
                  </p>
                  <input
                    type="url"
                    className="w-full rounded-lg border border-surface-800/60 bg-surface-950 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 placeholder:text-slate-600"
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
                    <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-brand-500/30 bg-brand-500/5 p-6 text-center">
                      <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400 mb-2">
                        <path d="M12 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6l-4-4z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 2v4h4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-sm text-brand-400 font-medium">{pdfFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(pdfFile.size / 1024).toFixed(0)} KB
                      </p>
                      <button
                        type="button"
                        className="mt-3 text-sm text-slate-400 hover:text-white transition"
                        onClick={removeFile}
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed p-8 text-center transition ${
                        isDragging
                          ? "border-brand-500 bg-brand-500/10"
                          : "border-slate-700 hover:border-brand-500/50"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                    >
                      <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500 mb-2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 14V3M10 3l3 3M10 3L7 6" />
                        <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" />
                      </svg>
                      <span className="text-sm text-slate-400">
                        Drag and drop a PDF, or <span className="text-brand-400">browse</span>
                      </span>
                      <span className="text-xs text-slate-600 mt-1">Max 5MB</span>
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
                className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                      <path d="M12 2a10 10 0 019.75 7.75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Checking...
                  </span>
                ) : (
                  "Check facts"
                )}
              </button>
            </div>

            {/* Progress steps */}
            {loading && (
              <div className="flex items-center gap-2 pl-1">
                {STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-1.5">
                    <div
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        i <= loadingStep ? "bg-brand-500" : "bg-slate-700"
                      }`}
                    />
                    <span
                      className={`text-xs transition-colors ${
                        i === loadingStep
                          ? "text-brand-400 font-medium"
                          : i < loadingStep
                            ? "text-slate-500"
                            : "text-slate-700"
                      }`}
                    >
                      {step}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className={`h-px w-4 ${i < loadingStep ? "bg-brand-500/50" : "bg-slate-800"}`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </form>

          {error && (
            <div className="mt-4 rounded-lg border border-red-800/50 bg-red-950/30 p-4 animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-red-400 text-sm">Something went wrong</p>
                  <p className="mt-1 text-sm text-red-300/80">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-slate-500 hover:text-slate-300 transition p-1"
                  aria-label="Dismiss error"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 3l8 8M11 3l-8 8" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* History sidebar */}
        {history.length > 0 && (
          <aside className="w-full lg:w-64 shrink-0">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent checks
            </h2>
            <ul className="space-y-2">
              {history.map((entry) => (
                <li key={entry.packId}>
                  <Link
                    href={`/report/${entry.packId}`}
                    className="block rounded-lg border border-surface-800/60 bg-surface-900 px-3 py-2.5 transition hover:border-slate-600"
                  >
                    <p className="text-xs text-slate-500">
                      {new Date(entry.ts).toLocaleString()}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-300">{entry.snippet}</p>
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
