import { NextRequest, NextResponse } from "next/server";
import { getPack } from "@/lib/jobs-db";
import { analyzePackDecay, freshnessLabel } from "@/lib/decay";

/**
 * GET /api/badge/[id]
 *
 * Returns an SVG badge showing trust score + freshness for embedding.
 * Public endpoint — pack UUIDs are unguessable.
 *
 * Query params:
 *   ?format=json  — returns JSON instead of SVG (for the JS widget)
 *   ?style=flat    — flat badge style (default)
 *   ?style=pill    — rounded pill style
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pack = await getPack(params.id);
  if (!pack) {
    return new NextResponse(renderErrorSvg("Not Found"), {
      status: 404,
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" },
    });
  }

  const claims = pack.claims ?? [];
  const total = claims.length;
  const supported = claims.filter((c) => c.status === "supported").length;
  const mixed = claims.filter((c) => c.status === "mixed").length;
  const unsupported = claims.filter((c) => c.status === "unsupported").length;
  const insufficient = claims.filter((c) => c.status === "insufficient").length;
  // Trust score based only on verifiable claims (exclude insufficient)
  const verifiable = supported + mixed + unsupported;
  const trustScore =
    verifiable > 0
      ? Math.round((supported / verifiable) * 100)
      : 0;

  // Decay analysis
  const decay = analyzePackDecay(claims, pack.createdAt);
  const freshness = decay.packFreshness;
  const { label: freshnessLabelText } = freshnessLabel(freshness);

  const format = request.nextUrl.searchParams.get("format");

  if (format === "json") {
    return NextResponse.json(
      {
        packId: params.id,
        trustScore,
        freshness,
        freshnessLabel: freshnessLabelText,
        totalClaims: total,
        supported,
        mixed,
        unsupported,
        insufficient,
        staleClaims: decay.staleClaims,
        expiredClaims: decay.expiredClaims,
        verifiedAt: pack.createdAt,
        engineVersion: pack.engineVersion,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // SVG badge
  const style = request.nextUrl.searchParams.get("style") ?? "flat";
  const svg = renderBadgeSvg(trustScore, freshness, freshnessLabelText, style);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function trustColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function freshnessColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#eab308";
  if (score >= 25) return "#f97316";
  return "#ef4444";
}

function renderBadgeSvg(
  trustScore: number,
  freshness: number,
  freshnessText: string,
  style: string
): string {
  const tc = trustColor(trustScore);
  const fc = freshnessColor(freshness);
  const radius = style === "pill" ? "12" : "4";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="32" viewBox="0 0 280 32">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="280" height="32" rx="${radius}" fill="url(#bg)" stroke="#334155" stroke-width="1"/>
  <!-- Checkmark icon -->
  <circle cx="18" cy="16" r="8" fill="none" stroke="#22d3ee" stroke-width="1.5"/>
  <path d="M13 16l3 3 5-5" fill="none" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Trust score -->
  <text x="32" y="20" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#e2e8f0">
    Factward
  </text>
  <!-- Divider -->
  <line x1="100" y1="6" x2="100" y2="26" stroke="#475569" stroke-width="1"/>
  <!-- Score -->
  <text x="110" y="20" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="${tc}">
    ${trustScore}% Trust
  </text>
  <!-- Divider -->
  <line x1="185" y1="6" x2="185" y2="26" stroke="#475569" stroke-width="1"/>
  <!-- Freshness -->
  <circle cx="197" cy="16" r="4" fill="${fc}" opacity="0.8"/>
  <text x="207" y="20" font-family="system-ui,sans-serif" font-size="10" fill="${fc}">
    ${freshnessText}
  </text>
</svg>`;
}

function renderErrorSvg(message: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="32" viewBox="0 0 200 32">
  <rect width="200" height="32" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
  <text x="100" y="20" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#94a3b8">
    ${message}
  </text>
</svg>`;
}
