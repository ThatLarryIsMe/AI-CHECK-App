"use client";

import { useState } from "react";
import Link from "next/link";
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

interface ReportStats {
  total: number;
  supported: number;
  mixed: number;
  unsupported: number;
  avgConfidence: number;
  trustScore: number;
}

const STATUS_LABELS: Record<string, string> = {
  supported: "Supported",
  mixed: "Not Enough Info",
  unsupported: "Unsupported",
};

const STATUS_COLORS: Record<string, string> = {
  supported: "text-green-400",
  mixed: "text-yellow-400",
  unsupported: "text-red-400",
};

const STATUS_BG: Record<string, string> = {
  supported: "bg-green-500/10 border-green-500/30",
  mixed: "bg-yellow-500/10 border-yellow-500/30",
  unsupported: "bg-red-500/10 border-red-500/30",
};

function TrustScoreGauge({ score }: { score: number }) {
  // Color based on score
  const color =
    score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const label =
    score >= 70 ? "High Trust" : score >= 40 ? "Mixed" : "Low Trust";

  // SVG arc
  const radius = 60;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="100" viewBox="0 0 160 100">
        {/* Background arc */}
        <path
          d="M 10 90 A 60 60 0 0 1 150 90"
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 10 90 A 60 60 0 0 1 150 90"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${offset}`}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        {/* Score text */}
        <text
          x="80"
          y="75"
          textAnchor="middle"
          className="fill-white text-3xl font-bold"
          style={{ fontSize: "28px", fontWeight: "bold" }}
        >
          {score}%
        </text>
      </svg>
      <p className="mt-1 text-sm font-medium" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

export function ReportClient({
  pack,
  packId,
  stats,
  version,
}: {
  pack: EvidencePack;
  packId: string;
  stats: ReportStats;
  version: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [embedCopyState, setEmbedCopyState] = useState<"idle" | "copied">("idle");
  const [showEmbed, setShowEmbed] = useState(false);

  const reportUrl = typeof window !== "undefined" ? window.location.href : "";
  const claims = pack.claims as ClaimWithEvidence[];

  function handleCopyLink() {
    void navigator.clipboard.writeText(reportUrl).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    });
  }

  function handleShareTwitter() {
    const text = `I just verified ${stats.total} claims with ProofMode AI — Trust Score: ${stats.trustScore}%\n\n${stats.supported} supported, ${stats.unsupported} unsupported.`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(reportUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleCopyEmbed() {
    const embedCode = `<a href="${reportUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#0f172a;border:1px solid #22d3ee;border-radius:8px;color:#22d3ee;font-family:system-ui;font-size:13px;font-weight:600;text-decoration:none"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#22d3ee" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Verified by ProofMode — ${stats.trustScore}% Trust Score</a>`;
    void navigator.clipboard.writeText(embedCode).then(() => {
      setEmbedCopyState("copied");
      setTimeout(() => setEmbedCopyState("idle"), 2000);
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">
            ProofMode Verification Report
          </p>
          <h1 className="text-3xl font-bold text-white">Fact-Check Results</h1>
          <p className="mt-2 text-sm text-slate-500">
            Pack ID: {packId} &middot; Engine: {pack.engineVersion}
          </p>
        </div>

        {/* Trust Score + Stats */}
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
            <TrustScoreGauge score={stats.trustScore} />

            <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-400">Claims</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.supported}</p>
                <p className="text-xs text-slate-400">Supported</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{stats.mixed}</p>
                <p className="text-xs text-slate-400">Mixed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.unsupported}</p>
                <p className="text-xs text-slate-400">Unsupported</p>
              </div>
            </div>
          </div>

          {/* Share buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-slate-700 pt-4">
            <button
              onClick={handleCopyLink}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-400 hover:text-white"
            >
              {copyState === "copied" ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={handleShareTwitter}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-400 hover:text-white"
            >
              Share on X
            </button>
            <button
              onClick={() => setShowEmbed(!showEmbed)}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-400 hover:text-white"
            >
              Embed Badge
            </button>
          </div>

          {/* Embed code */}
          {showEmbed && (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Embed this badge on your site
              </p>
              <div className="mb-3 flex justify-center">
                {/* Badge preview */}
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-cyan-400"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="#22d3ee" strokeWidth="1.5" />
                    <path d="M5 8l2 2 4-4" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Verified by ProofMode — {stats.trustScore}% Trust Score
                </span>
              </div>
              <button
                onClick={handleCopyEmbed}
                className="w-full rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                {embedCopyState === "copied" ? "Copied!" : "Copy Embed Code"}
              </button>
            </div>
          )}
        </div>

        {/* Claims list */}
        <div className="space-y-4">
          {claims.map((claim, i) => {
            const status = claim.classification ?? claim.status;
            const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];
            const confidence =
              claim.confidence > 1 ? claim.confidence : Math.round(claim.confidence * 100);

            return (
              <div
                key={i}
                className={`rounded-xl border p-5 ${STATUS_BG[status] ?? "bg-slate-900 border-slate-800"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="flex-1 font-medium text-slate-100">{claim.text}</p>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_COLORS[status]}`}
                  >
                    {STATUS_LABELS[status] ?? status}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Confidence: {confidence}%
                </div>

                {/* Evidence */}
                {evidence.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {evidence.map((item, j) => (
                      <div key={j} className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-cyan-400 hover:underline"
                        >
                          {item.sourceTitle}
                        </a>
                        <blockquote className="mt-1.5 border-l-2 border-slate-600 pl-3 text-sm italic text-slate-300">
                          {item.quotedSpan}
                        </blockquote>
                      </div>
                    ))}
                  </div>
                )}
                {evidence.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500">LLM-only classification (no web sources retrieved)</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Methodology footer */}
        <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
          <h3 className="mb-2 font-semibold text-slate-300">About this report</h3>
          <p>
            This verification was performed by ProofMode v{version} using AI claim extraction,
            classification, and web evidence retrieval. Confidence scores are model-internal
            estimates. This is not a substitute for professional fact-checking.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <Link
              href="/trust"
              className="text-cyan-400 underline hover:text-cyan-300"
            >
              How it works
            </Link>
            <Link
              href="/verify"
              className="text-cyan-400 underline hover:text-cyan-300"
            >
              Check your own facts
            </Link>
          </div>
        </div>

        {/* CTA for non-users */}
        <div className="mt-8 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6 text-center">
          <h3 className="mb-2 text-lg font-bold text-white">
            Want to verify your own content?
          </h3>
          <p className="mb-4 text-sm text-slate-400">
            ProofMode breaks down any text into individual claims and checks each one
            against real sources. Free to start.
          </p>
          <Link
            href="/signup"
            className="inline-block rounded-lg bg-cyan-500 px-6 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Start Free
          </Link>
        </div>
      </div>
    </main>
  );
}
