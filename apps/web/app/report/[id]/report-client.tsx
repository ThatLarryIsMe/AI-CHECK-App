"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EvidencePack } from "@factward/core";

type ClaimWithEvidence = EvidencePack["claims"][number] & {
  classification?: string;
  reasoning?: string;
  verdictScore?: number;
  subClaimRationale?: string;
  evidenceBreakdown?: {
    supporting: number;
    contradicting: number;
    neutral: number;
  };
  evidence?: Array<{
    sourceUrl: string;
    sourceTitle: string;
    quotedSpan: string;
    retrievedAt: string;
    stance?: "supporting" | "contradicting" | "neutral";
  }>;
};

interface ReportStats {
  total: number;
  supported: number;
  mixed: number;
  unsupported: number;
  insufficient: number;
  avgConfidence: number;
  trustScore: number;
  overarchingScore: number;
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

/* ── Verdict score color system (red → green gradient) ── */

function verdictColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green-500
  if (score >= 65) return "#84cc16"; // lime-500
  if (score >= 50) return "#eab308"; // yellow-500
  if (score >= 35) return "#f97316"; // orange-500
  if (score >= 20) return "#ef4444"; // red-500
  return "#dc2626"; // red-600
}

function verdictBg(score: number): string {
  if (score >= 80) return "bg-green-500/10 border-green-500/30";
  if (score >= 65) return "bg-lime-500/10 border-lime-500/30";
  if (score >= 50) return "bg-yellow-500/10 border-yellow-500/30";
  if (score >= 35) return "bg-orange-500/10 border-orange-500/30";
  if (score >= 20) return "bg-red-500/10 border-red-500/30";
  return "bg-red-600/10 border-red-600/30";
}

function verdictLabel(score: number): string {
  if (score >= 80) return "Verified";
  if (score >= 65) return "Well Supported";
  if (score >= 50) return "Mostly Supported";
  if (score >= 35) return "Mixed Evidence";
  if (score >= 20) return "Poorly Supported";
  return "Refuted";
}

function verdictTextColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 65) return "text-lime-400";
  if (score >= 50) return "text-yellow-400";
  if (score >= 35) return "text-orange-400";
  if (score >= 20) return "text-red-400";
  return "text-red-500";
}

/** Fallback for old packs without verdictScore */
const LEGACY_STATUS_LABELS: Record<string, string> = {
  supported: "Supported",
  mixed: "Conflicting Sources",
  unsupported: "Unsupported",
  insufficient: "Insufficient Evidence",
};

const LEGACY_STATUS_BG: Record<string, string> = {
  supported: "bg-green-500/10 border-green-500/30",
  mixed: "bg-orange-500/10 border-orange-500/30",
  unsupported: "bg-red-500/10 border-red-500/30",
  insufficient: "bg-slate-500/10 border-slate-500/30",
};

const LEGACY_STATUS_COLORS: Record<string, string> = {
  supported: "text-green-400",
  mixed: "text-orange-400",
  unsupported: "text-red-400",
  insufficient: "text-slate-400",
};

const STANCE_COLORS: Record<string, string> = {
  supporting: "border-green-500/40 bg-green-500/5",
  contradicting: "border-red-500/40 bg-red-500/5",
  neutral: "border-slate-600/40 bg-slate-800/50",
};

const STANCE_LABELS: Record<string, string> = {
  supporting: "Supports claim",
  contradicting: "Contradicts claim",
  neutral: "Neutral / tangential",
};

const STANCE_TEXT_COLORS: Record<string, string> = {
  supporting: "text-green-400",
  contradicting: "text-red-400",
  neutral: "text-slate-500",
};

function freshnessBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-500";
}

/* ── Overarching Score Gauge ── */

function OverarchingScoreGauge({ score, verdict }: { score: number; verdict: string }) {
  const color = verdictColor(score);
  const label = verdictLabel(score);

  const radius = 60;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="100" viewBox="0 0 160 100" role="img" aria-label={`Overall score: ${score}% — ${label}`}>
        {/* Track background */}
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
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
          {score}
        </text>
      </svg>
      <p className="mt-1 text-sm font-semibold" style={{ color }}>
        {label}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 text-center max-w-[200px]">{verdict}</p>
    </div>
  );
}

/* ── Mini verdict bar for individual claims ── */

function VerdictBar({ score }: { score: number }) {
  const color = verdictColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

/* ── Evidence breakdown mini chart ── */

function EvidenceBreakdownChart({ breakdown }: { breakdown: { supporting: number; contradicting: number; neutral: number } }) {
  const total = breakdown.supporting + breakdown.contradicting + breakdown.neutral;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-green-400">{breakdown.supporting} for</span>
      <span className="text-slate-600">/</span>
      <span className="text-red-400">{breakdown.contradicting} against</span>
      <span className="text-slate-600">/</span>
      <span className="text-slate-400">{breakdown.neutral} neutral</span>
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

/* ── Color legend ── */

function ScoreLegend() {
  const ranges = [
    { min: 80, max: 100, label: "Verified", color: "#22c55e" },
    { min: 65, max: 79, label: "Well Supported", color: "#84cc16" },
    { min: 50, max: 64, label: "Mostly Supported", color: "#eab308" },
    { min: 35, max: 49, label: "Mixed", color: "#f97316" },
    { min: 20, max: 34, label: "Poorly Supported", color: "#ef4444" },
    { min: 0, max: 19, label: "Refuted", color: "#dc2626" },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
      {ranges.map((r) => (
        <span key={r.label} className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
          {r.min}-{r.max} {r.label}
        </span>
      ))}
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

  // Close embed dialog on Escape key
  useEffect(() => {
    if (!showEmbed) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowEmbed(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showEmbed]);

  const reportUrl = typeof window !== "undefined" ? window.location.href : "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const claims = pack.claims as ClaimWithEvidence[];
  const hasVerdictScores = claims.some((c) => typeof c.verdictScore === "number" && c.verdictScore > 0);
  const overarchingClaim = (pack as { overarchingClaim?: string }).overarchingClaim;
  const overarchingScore = stats.overarchingScore ?? stats.trustScore;
  const overarchingVerdict = (pack as { overarchingVerdict?: string }).overarchingVerdict ?? "";

  // Map evidence to claims for display
  const evidenceByClaimId = new Map<string, Array<{
    sourceUrl: string;
    sourceTitle: string;
    quotedSpan: string;
    retrievedAt: string;
    stance?: "supporting" | "contradicting" | "neutral";
  }>>();
  for (const ev of pack.evidence) {
    const list = evidenceByClaimId.get(ev.claimId) ?? [];
    list.push({
      sourceUrl: ev.sourceUrl,
      sourceTitle: ev.sourceTitle ?? ev.sourceUrl,
      quotedSpan: ev.quotedSpan ?? ev.snippet,
      retrievedAt: ev.retrievedAt ?? "",
      stance: (ev as { stance?: "supporting" | "contradicting" | "neutral" }).stance,
    });
    evidenceByClaimId.set(ev.claimId, list);
  }

  function handleCopyLink() {
    void navigator.clipboard.writeText(reportUrl).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    });
  }

  function handleShareTwitter() {
    const scoreLabel = verdictLabel(overarchingScore);

    const summary = overarchingClaim
      ? (overarchingClaim.length > 120 ? overarchingClaim.slice(0, 117) + "..." : overarchingClaim)
      : claims.slice(0, 2).map((c) => c.text).join(". ").slice(0, 120);

    const text = [
      `\u{1F50D} "${summary}"`,
      ``,
      `Fact-checked ${stats.total} claims — Score: ${overarchingScore}/100 (${scoreLabel})`,
      ``,
      `Full report \u2B07\uFE0F`,
    ].join("\n");

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(reportUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleCopyEmbed() {
    const embedCode = `<a href="${reportUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#0f172a;border:1px solid #22d3ee;border-radius:8px;color:#22d3ee;font-family:system-ui;font-size:13px;font-weight:600;text-decoration:none"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#22d3ee" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Verified by Factward — Score ${overarchingScore}/100</a>`;
    void navigator.clipboard.writeText(embedCode).then(() => {
      setEmbedCopyState("copied");
      setTimeout(() => setEmbedCopyState("idle"), 2000);
    });
  }

  function handleCopyWidget() {
    const widgetCode = `<div data-factward-badge="${packId}"></div>\n<script src="${origin}/badge.js" async></script>`;
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

  const isHighScore = overarchingScore >= 80;
  const celebrationMessage = isHighScore
    ? overarchingScore >= 95
      ? "Exceptionally well verified. The central thesis holds up strongly."
      : "Strong verification. The evidence supports the central claim."
    : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Factward Verification Report
          </p>
          <h1 className="text-3xl font-bold text-white">Fact-Check Results</h1>
          <p className="mt-2 text-sm text-slate-500">
            Pack ID: {packId} &middot; Engine: {pack.engineVersion}
          </p>
        </div>

        {/* Overarching Claim */}
        {overarchingClaim && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-2">
              Central Thesis Under Investigation
            </p>
            <p className="text-lg font-medium text-white leading-relaxed">
              &ldquo;{overarchingClaim}&rdquo;
            </p>
            <p className="mt-2 text-sm text-slate-400">
              The following sub-claims were identified to stress-test this thesis from multiple angles.
            </p>
          </div>
        )}

        {/* Celebration banner for high score */}
        {celebrationMessage && (
          <div className="trust-shimmer mb-6 rounded-xl border border-green-500/30 bg-green-500/5 px-6 py-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2"/>
                <path d="M8 12l3 3 5-5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-lg font-bold text-green-400">{celebrationMessage}</p>
            </div>
          </div>
        )}

        {/* Overall Score + Freshness + Stats */}
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
            <OverarchingScoreGauge score={overarchingScore} verdict={overarchingVerdict} />

            {decay && (
              <FreshnessGauge freshness={decay.packFreshness} label={freshnessLabel} />
            )}

            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-400">Sub-claims</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.supported}</p>
                <p className="text-xs text-slate-400">Supported</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.unsupported}</p>
                <p className="text-xs text-slate-400">Refuted</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-400">{stats.mixed + stats.insufficient}</p>
                <p className="text-xs text-slate-400">Mixed / Unclear</p>
              </div>
            </div>
          </div>

          {/* Score legend */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <ScoreLegend />
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
                    Verified by Factward — Score {overarchingScore}/100
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
                  Live widget (JS) — auto-updates with score + freshness
                </p>
                <div className="mb-3 rounded-lg border border-slate-600 bg-slate-900 p-3">
                  <code className="block text-xs text-slate-300 whitespace-pre-wrap break-all">
                    {`<div data-factward-badge="${packId}"></div>\n<script src="${origin}/badge.js" async></script>`}
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

        {/* Sub-claims list */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white mb-1">Sub-Claim Analysis</h2>
          <p className="text-sm text-slate-400">
            Each sub-claim tests a different facet of the central thesis. Evidence is classified as supporting, contradicting, or neutral.
          </p>
        </div>

        <div className="space-y-4">
          {claims.map((claim, i) => {
            const status = claim.classification ?? claim.status;
            const evidence = claim.evidence ?? evidenceByClaimId.get(claim.id) ?? [];
            const hasScore = typeof claim.verdictScore === "number" && claim.verdictScore > 0;
            const score = hasScore ? claim.verdictScore! : (claim.confidence > 1 ? claim.confidence : Math.round(claim.confidence * 100));
            const claimDecay = decay?.claims?.[i];

            // Use new verdict system if available, fall back to legacy
            const bgClass = hasScore ? verdictBg(score) : (LEGACY_STATUS_BG[status] ?? "bg-slate-900 border-slate-800");
            const labelText = hasScore ? verdictLabel(score) : (LEGACY_STATUS_LABELS[status] ?? status);
            const labelColor = hasScore ? verdictTextColor(score) : (LEGACY_STATUS_COLORS[status] ?? "text-slate-400");

            return (
              <div
                key={i}
                className={`rounded-xl border p-5 ${bgClass}`}
              >
                {/* Claim header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-slate-100">{claim.text}</p>
                    {/* Sub-claim rationale */}
                    {claim.subClaimRationale && (
                      <p className="mt-1.5 text-xs text-cyan-400/80 italic">
                        <span className="not-italic font-semibold text-cyan-400">Why this matters: </span>
                        {claim.subClaimRationale}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${labelColor}`}
                    >
                      {labelText}
                    </span>
                    {hasScore && <VerdictBar score={score} />}
                  </div>
                </div>

                {/* Evidence breakdown + decay */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  {claim.evidenceBreakdown && (
                    <EvidenceBreakdownChart breakdown={claim.evidenceBreakdown} />
                  )}
                  {!hasScore && (
                    <span>Confidence: {score}%</span>
                  )}
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

                {/* Reasoning */}
                {claim.reasoning && (
                  <p className="mt-3 text-sm text-slate-400 italic">
                    <span className="not-italic font-medium text-slate-300">Analysis: </span>
                    {claim.reasoning}
                  </p>
                )}

                {/* Evidence with stance labels */}
                {evidence.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Web sources ({evidence.length})
                    </p>
                    {evidence.map((item, j) => {
                      const stance = item.stance ?? "neutral";
                      const stanceBg = STANCE_COLORS[stance] ?? STANCE_COLORS.neutral;
                      const stanceLabel = STANCE_LABELS[stance] ?? "Neutral";
                      const stanceTextColor = STANCE_TEXT_COLORS[stance] ?? "text-slate-500";

                      return (
                        <div key={j} className={`rounded-lg border p-3 ${stanceBg}`}>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-cyan-400 hover:underline truncate"
                            >
                              {item.sourceTitle}
                            </a>
                            <span className={`shrink-0 text-xs font-semibold uppercase tracking-wide ${stanceTextColor}`}>
                              {stanceLabel}
                            </span>
                          </div>
                          <p className="border-l-2 border-slate-600 pl-3 text-sm text-slate-300">
                            {item.quotedSpan}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {evidence.length === 0 && (
                  <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                    <p className="text-xs text-yellow-400/80">
                      No web evidence retrieved for this claim. Cannot verify or refute without sources.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Methodology footer */}
        <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
          <h3 className="mb-2 font-semibold text-slate-300">About this report</h3>
          <p>
            This verification was performed by Factward v{version}. The system first identifies the
            central thesis of the input, then decomposes it into sub-claims that stress-test
            the thesis from multiple angles (factual foundation, causal logic, source attribution,
            context, magnitude, and temporal accuracy). Each sub-claim is independently verified
            against web evidence. Sources are classified as supporting, contradicting, or neutral.
            Scores range from 0 (refuted) to 100 (verified) based on the balance and quality of evidence.
          </p>
          <p className="mt-2">
            <span className="font-medium text-slate-300">Scoring methodology:</span>{" "}
            Each sub-claim receives a verdict score (0-100) based on the quality, independence,
            and balance of supporting vs. contradicting evidence. The overall score is a
            weighted average where claims with more evidence carry more weight. Verdicts are
            based ONLY on retrieved evidence — never on AI knowledge alone.
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
            Don&apos;t publish without checking first.
          </h3>
          <p className="mb-4 text-sm text-slate-400">
            Factward identifies the central thesis and stress-tests it from every angle —
            so you know exactly where the evidence stands.
          </p>
          <Link
            href="/signup"
            className="inline-block rounded-lg bg-cyan-500 px-6 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Try It Free
          </Link>
        </div>
      </div>
    </main>
  );
}
