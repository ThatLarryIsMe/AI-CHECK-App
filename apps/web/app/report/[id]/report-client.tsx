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

interface ClaimDecayData {
  category: string;
  freshness: number;
  label: string;
  textColor: string;
}

interface DecayData {
  packFreshness: number;
  staleClaims: number;
  expiredClaims: number;
  claims: ClaimDecayData[];
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

function freshnessBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function TrustScoreGauge({ score }: { score: number }) {
  const color =
    score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const label =
    score >= 70 ? "High Trust" : score >= 40 ? "Mixed" : "Low Trust";

  const radius = 60;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="100" viewBox="0 0 160 100">
        <path
          d="M 10 90 A 60 60 0 0 1 150 90"
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />
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

function FreshnessGauge({ freshness, label }: { freshness: number; label: string }) {
  const color =
    freshness >= 80 ? "#22c55e" : freshness >= 50 ? "#eab308" : freshness >= 25 ? "#f97316" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-16 w-16">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#1e293b" strokeWidth="4" />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - freshness / 100)}`}
            transform="rotate(-90 32 32)"
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
          <text
            x="32"
            y="36"
            textAnchor="middle"
            className="fill-white"
            style={{ fontSize: "14px", fontWeight: "bold" }}
          >
            {freshness}%
          </text>
        </svg>
      </div>
      <p className="mt-1 text-xs font-medium" style={{ color }}>
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
  decay,
}: {
  pack: EvidencePack;
  packId: string;
  stats: ReportStats;
  version: string;
  decay?: DecayData;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [embedCopyState, setEmbedCopyState] = useState<"idle" | "copied">("idle");
  const [widgetCopyState, setWidgetCopyState] = useState<"idle" | "copied">("idle");
  const [showEmbed, setShowEmbed] = useState(false);

  const reportUrl = typeof window !== "undefined" ? window.location.href : "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
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

  function handleCopyWidget() {
    const widgetCode = `<div data-proofmode-badge="${packId}"></div>\n<script src="${origin}/badge.js" async></script>`;
    void navigator.clipboard.writeText(widgetCode).then(() => {
      setWidgetCopyState("copied");
      setTimeout(() => setWidgetCopyState("idle"), 2000);
    });
  }

  const freshnessLabel = decay
    ? decay.packFreshness >= 80
      ? "Fresh"
      : decay.packFreshness >= 50
        ? "Aging"
        : decay.packFreshness >= 25
          ? "Stale"
          : "Expired"
    : "Fresh";

  const isHighTrust = stats.trustScore >= 80;
  const celebrationMessage = isHighTrust
    ? stats.trustScore === 100
      ? "Perfect score. Every claim checks out."
      : "Strong verification. This content holds up."
    : null;

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

        {/* Celebration banner for high trust */}
        {celebrationMessage && (
          <div className="trust-shimmer mb-6 rounded-xl border border-green-500/30 bg-green-500/5 px-6 py-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2"/>
                <path d="M8 12l3 3 5-5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-lg font-bold text-green-400">{celebrationMessage}</p>
            </div>
            {stats.trustScore === 100 && (
              <p className="mt-1 text-sm text-green-400/60">
                All {stats.total} claims verified as supported with evidence.
              </p>
            )}
          </div>
        )}

        {/* Trust Score + Freshness + Stats */}
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
            <TrustScoreGauge score={stats.trustScore} />

            {decay && (
              <FreshnessGauge freshness={decay.packFreshness} label={freshnessLabel} />
            )}

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

          {/* Decay warning banner */}
          {decay && decay.staleClaims > 0 && (
            <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-lg">&#9888;</span>
                <div>
                  <p className="text-sm font-medium text-yellow-400">
                    {decay.staleClaims} of {stats.total} claims may need re-verification
                  </p>
                  <p className="text-xs text-yellow-400/70 mt-0.5">
                    Claims decay at different rates based on their type. Statistics go stale faster than scientific findings.
                  </p>
                </div>
              </div>
              <Link
                href="/verify"
                className="mt-2 inline-block rounded bg-yellow-500/20 px-3 py-1.5 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-500/30"
              >
                Re-verify this content
              </Link>
            </div>
          )}

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

          {/* Embed options */}
          {showEmbed && (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-4">
              {/* Simple badge */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Simple badge (HTML)
                </p>
                <div className="mb-3 flex justify-center">
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

              {/* Live widget */}
              <div className="border-t border-slate-700 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Live widget (JS) — auto-updates with trust score + freshness
                </p>
                <div className="mb-3 rounded-lg border border-slate-600 bg-slate-900 p-3">
                  <code className="block text-xs text-slate-300 whitespace-pre-wrap break-all">
                    {`<div data-proofmode-badge="${packId}"></div>\n<script src="${origin}/badge.js" async></script>`}
                  </code>
                </div>
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1">Also available as SVG image:</p>
                  <code className="block text-xs text-slate-400 bg-slate-900 rounded p-2 break-all">
                    {`${origin}/api/badge/${packId}`}
                  </code>
                </div>
                <button
                  onClick={handleCopyWidget}
                  className="w-full rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  {widgetCopyState === "copied" ? "Copied!" : "Copy Widget Code"}
                </button>
              </div>
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
            const claimDecay = decay?.claims?.[i];

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
                <div className="mt-2 flex items-center gap-4 text-sm text-slate-400">
                  <span>Confidence: {confidence}%</span>
                  {claimDecay && (
                    <span className="flex items-center gap-1.5">
                      <span className="text-slate-600">|</span>
                      <span className={claimDecay.textColor}>
                        {claimDecay.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({claimDecay.category})
                      </span>
                      <div className="ml-1 h-1.5 w-16 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${freshnessBarColor(claimDecay.freshness)}`}
                          style={{ width: `${claimDecay.freshness}%` }}
                        />
                      </div>
                    </span>
                  )}
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
          {decay && (
            <p className="mt-2">
              <span className="font-medium text-slate-300">Freshness tracking:</span>{" "}
              Each claim is categorized (statistic, economic, scientific, etc.) and assigned a decay
              curve. Statistics go stale in ~2 weeks; scientific findings last ~6 months.
              Re-verify when claims show as &ldquo;Stale&rdquo; or &ldquo;Expired.&rdquo;
            </p>
          )}
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
