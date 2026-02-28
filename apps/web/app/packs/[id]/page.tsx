"use client";
import { useEffect, useState } from "react";
import type { EvidencePack } from "@proofmode/core";

const VERSION = "0.1.0";

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
  const [copyLinkState, setCopyLinkState] = useState<"idle" | "copied">("idle");
  const [copySummaryState, setCopySummaryState] = useState<"idle" | "copied">("idle");

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

  function handleCopyLink() {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyLinkState("copied");
      setTimeout(() => setCopyLinkState("idle"), 2000);
    });
  }

  function handleCopySummary() {
    if (!pack) return;
    const claims = pack.claims as ClaimWithEvidence[];
    const supported = claims.filter((c) => (c.classification ?? c.status) === "supported").length;
    const mixed = claims.filter((c) => (c.classification ?? c.status) === "mixed").length;
    const unsupported = claims.filter((c) => (c.classification ?? c.status) === "unsupported").length;
    const total = claims.length;

    const confidences = claims
      .map((c) => (c.confidence != null ? (c.confidence > 1 ? c.confidence : Math.round(c.confidence * 100)) : null))
      .filter((v): v is number => v !== null);
    const avgConfidence =
      confidences.length > 0
        ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
        : null;

    const totalEvidence = claims.reduce((sum, c) => sum + (Array.isArray(c.evidence) ? c.evidence.length : 0), 0);
    const retrievalLine = totalEvidence > 0 ? "Retrieval: Evidence attached" : "Retrieval: LLM-only mode";

    const generatedAt = (pack as Record<string, unknown>).generatedAt as string | undefined;

    const top3 = claims.slice(0, 3).map((c, i) => {
      const text = c.text.length > 120 ? c.text.slice(0, 117) + "..." : c.text;
      const cls = STATUS_LABELS[c.classification ?? c.status] ?? (c.classification ?? c.status);
      return `${i + 1}. [${cls}] ${text}`;
    });

    const lines: string[] = [
      `ProofMode v${VERSION}`,
      `Pack ID: ${params.id}`,
      ...(generatedAt ? [`Generated: ${new Date(generatedAt).toLocaleString()}`] : []),
      "",
      `Totals: ${supported} Supported / ${mixed} Mixed / ${unsupported} Refuted / ${total} total`,
      ...(avgConfidence !== null ? [`Avg confidence: ${avgConfidence}%`] : []),
      retrievalLine,
      "",
      "Top claims:",
      ...top3,
      "",
      window.location.href,
    ];

    void navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopySummaryState("copied");
      setTimeout(() => setCopySummaryState("idle"), 2000);
    });
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8 text-slate-100">
        <h1 className="text-2xl font-bold">Failed to load pack</h1>
        <p className="mt-2 text-slate-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-cyan-400 underline hover:text-cyan-300"
        >
          Retry
        </button>
      </main>
    );
  }

  if (!pack) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8 text-slate-100">
        <p className="animate-pulse text-slate-400">Loading evidence pack…</p>
      </main>
    );
  }

  const claims = pack.claims as ClaimWithEvidence[];
  const supported = claims.filter((c) => (c.classification ?? c.status) === "supported").length;
  const mixed = claims.filter((c) => (c.classification ?? c.status) === "mixed").length;
  const unsupported = claims.filter((c) => (c.classification ?? c.status) === "unsupported").length;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Evidence Pack</h1>
        <p className="mt-1 text-sm text-slate-400">ID: {params.id}</p>

        {/* Export + Share button row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportMarkdown}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-700"
          >
            ↓ Markdown
          </button>
          <button
            onClick={handleExportJSON}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-700"
          >
            ↓ JSON
          </button>

          <div className="mx-1 h-4 w-px bg-slate-700" />

          <button
            onClick={handleCopyLink}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm transition hover:bg-slate-700"
            style={{ color: copyLinkState === "copied" ? "#34d399" : "#94a3b8" }}
          >
            {copyLinkState === "copied" ? "✓ Copied!" : "🔗 Copy Link"}
          </button>

          <button
            onClick={handleCopySummary}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm transition hover:bg-slate-700"
            style={{ color: copySummaryState === "copied" ? "#34d399" : "#94a3b8" }}
          >
            {copySummaryState === "copied" ? "✓ Copied!" : "📋 Copy Summary"}
          </button>
        </div>

        {/* Stats bar */}
        <div className="mt-6 flex flex-wrap gap-4 rounded-lg bg-slate-900 px-4 py-3 text-sm">
          <span className="text-green-400">✓ {supported} Supported</span>
          <span className="text-yellow-400">&nbsp;&nbsp;○ {mixed} Mixed</span>
          <span className="text-red-400">&nbsp;&nbsp;✕ {unsupported} Refuted</span>
          <span className="text-slate-400">&nbsp;&nbsp;{claims.length} total claims</span>
        </div>

        {/* Claims list */}
        {claims.map((claim, i) => {
          const classification = claim.classification ?? claim.status;
          const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];
          const confidence =
            claim.confidence > 1 ? claim.confidence : Math.round(claim.confidence * 100);
          return (
            <div key={i} className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="font-medium text-slate-100">{claim.text}</p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className={STATUS_COLORS[classification] ?? "text-slate-400"}>
                  {STATUS_LABELS[classification] ?? classification}
                </span>
                <span className="text-slate-400">Confidence: {confidence}%</span>
              </div>
              <div className="mt-3">
                {evidence.length > 0 ? (
                  <ul className="space-y-3">
                    {evidence.map((item, evidenceIndex) => (
                      <li key={evidenceIndex} className="rounded border border-slate-700 bg-slate-800 p-3">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-cyan-400 hover:underline"
                        >
                          {item.sourceTitle}
                        </a>
                        <p className="mt-0.5 text-xs text-slate-500">Retrieved via Brave Search</p>
                        <blockquote className="mt-2 border-l-2 border-slate-600 pl-3 text-sm italic text-slate-300">
                          {item.quotedSpan}
                        </blockquote>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No evidence retrieved (LLM-only mode)</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
