"use client";
import { useEffect, useState } from "react";
import type { EvidencePack } from "@proofmode/core";

type ClaimWithEvidence = EvidencePack["claims"][number] & {
  classification?: string;
  evidence?: Array<{
    sourceUrl: string;
    sourceTitle: string;
    quotedSpan: string;
    retrievedAt: string;
  }>;
};

const STATUS_LABELS: Record<string, string> = {
  supported: "Supported",
  mixed: "Not Enough Info",
  unsupported: "Refuted",
};

const STATUS_COLORS: Record<string, string> = {
  supported: "text-green-400",
  mixed: "text-yellow-400",
  unsupported: "text-red-400",
};

export default function PackPage({ params }: { params: { id: string } }) {
  const [pack, setPack] = useState<EvidencePack | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPack() {
      try {
        const response = await fetch(`/api/packs/${params.id}`);
        if (!response.ok) {
          throw new Error("Unable to load evidence pack");
        }
        const data = (await response.json()) as EvidencePack;
        setPack(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unexpected error");
      }
    }
    void loadPack();
  }, [params.id]);

  function handleExportMarkdown() {
    window.location.href = `/api/packs/${params.id}/export.md`;
  }

  function handleExportJSON() {
    if (!pack) return;
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-pack-${params.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-lg border border-red-700 bg-red-950/40 p-6">
          <p className="text-red-400 font-semibold text-lg">Failed to load pack</p>
          <p className="text-red-300 text-sm mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-cyan-400 underline hover:text-cyan-300"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!pack) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate-400 animate-pulse">Loading evidence pack…</p>
      </main>
    );
  }

  const claims = pack.claims as ClaimWithEvidence[];
  const supported = claims.filter((c) => (c.classification ?? c.status) === "supported").length;
  const mixed = claims.filter((c) => (c.classification ?? c.status) === "mixed").length;
  const unsupported = claims.filter((c) => (c.classification ?? c.status) === "unsupported").length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 mb-1">Evidence Pack</h1>
          <p className="text-slate-500 text-sm">ID: {params.id}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportMarkdown}
            className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold rounded-lg transition text-sm"
            title="Download as Markdown"
          >
            ↓ Markdown
          </button>
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition text-sm"
            title="Download as JSON"
          >
            ↓ JSON
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-8 text-sm">
        <span className="text-green-400">✓ {supported} Supported</span>
        <span className="text-yellow-400">○ {mixed} Mixed</span>
        <span className="text-red-400">✕ {unsupported} Refuted</span>
        <span className="text-slate-400">{claims.length} total claims</span>
      </div>

      <ul className="space-y-6">
        {claims.map((claim, i) => {
          const classification = claim.classification ?? claim.status;
          const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];
          const confidence = claim.confidence > 1 ? claim.confidence : Math.round(claim.confidence * 100);

          return (
            <li key={i} className="p-5 bg-slate-800 rounded-xl">
              <p className="text-white font-medium mb-2">{claim.text}</p>
              <div className="flex gap-4 text-sm mb-4">
                <span className={STATUS_COLORS[classification] ?? "text-slate-400"}>
                  {STATUS_LABELS[classification] ?? classification}
                </span>
                <span className="text-slate-400">Confidence: {confidence}%</span>
              </div>

              {evidence.length > 0 ? (
                <div className="space-y-3">
                  {evidence.map((item, evidenceIndex) => (
                    <article key={evidenceIndex} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline"
                        >
                          {item.sourceTitle}
                        </a>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                          Retrieved via Brave Search
                        </span>
                      </div>
                      <blockquote className="text-slate-300 border-l-2 border-slate-600 pl-3 italic">
                        {item.quotedSpan}
                      </blockquote>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No evidence retrieved (LLM-only mode)</p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
