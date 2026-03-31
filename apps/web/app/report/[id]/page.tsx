import type { Metadata } from "next";
import { cache } from "react";
import { getPack } from "@/lib/jobs-db";
import { VERSION } from "@/../../version";
import { ReportClient } from "./report-client";
import { analyzePackDecay } from "@/lib/decay";

interface PageProps {
  params: { id: string };
}

// Deduplicate the DB query between generateMetadata and the page component
const getCachedPack = cache((id: string) => getPack(id));

function computeStats(pack: {
  claims: Array<{ status: string; confidence: number; verdictScore?: number }>;
  overarchingScore?: number;
}) {
  const claims = pack.claims ?? [];
  const total = claims.length;
  const supported = claims.filter((c) => c.status === "supported").length;
  const mixed = claims.filter((c) => c.status === "mixed").length;
  const unsupported = claims.filter((c) => c.status === "unsupported").length;
  const insufficient = claims.filter((c) => c.status === "insufficient").length;
  const avgConfidence =
    total > 0
      ? Math.round(
          (claims.reduce((sum, c) => sum + (c.confidence ?? 0), 0) / total) * 100
        )
      : 0;

  // Use the pack-level overarching score if available (new engine 2.0)
  // Otherwise fall back to the legacy trust score formula
  let trustScore: number;
  let overarchingScore: number;

  if (typeof pack.overarchingScore === "number") {
    overarchingScore = pack.overarchingScore;
    trustScore = overarchingScore;
  } else {
    // Legacy: compute from status counts
    const verifiable = supported + mixed + unsupported;
    trustScore = verifiable > 0 ? Math.round((supported / verifiable) * 100) : 0;
    overarchingScore = trustScore;
  }

  return { total, supported, mixed, unsupported, insufficient, avgConfidence, trustScore, overarchingScore };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pack = await getCachedPack(params.id);
  if (!pack) {
    return { title: "Report Not Found — Factward" };
  }

  const { total, overarchingScore } = computeStats(pack);
  const scoreLabel =
    overarchingScore >= 80 ? "Verified"
      : overarchingScore >= 65 ? "Well Supported"
        : overarchingScore >= 50 ? "Mostly Supported"
          : overarchingScore >= 35 ? "Mixed"
            : overarchingScore >= 20 ? "Poorly Supported"
              : "Refuted";

  const overarchingClaim = (pack as { overarchingClaim?: string }).overarchingClaim;
  const thesisSummary = overarchingClaim
    ? `"${overarchingClaim.slice(0, 80)}${overarchingClaim.length > 80 ? "..." : ""}"`
    : `${total} claims analyzed`;

  const title = `Factward Report — ${overarchingScore}/100 (${scoreLabel})`;
  const description = `${thesisSummary} — Score: ${overarchingScore}/100. ${total} sub-claims stress-tested against web evidence by Factward.`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://factward.ai";
  const ogImageUrl = `${baseUrl}/report/${params.id}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Factward",
      type: "article",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ReportPage({ params }: PageProps) {
  // Server-side fetch for instant load + SEO
  const pack = await getCachedPack(params.id);

  if (!pack) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8 text-slate-100">
        <h1 className="text-2xl font-bold">Report not found</h1>
        <p className="mt-2 text-slate-400">This verification report doesn&apos;t exist or has been removed.</p>
      </main>
    );
  }

  const stats = computeStats(pack);
  const decay = analyzePackDecay(pack.claims, pack.createdAt);
  const decayData = {
    packFreshness: decay.packFreshness,
    staleClaims: decay.staleClaims,
    expiredClaims: decay.expiredClaims,
    claims: decay.claims.map((c) => ({
      category: c.category,
      freshness: c.freshness,
      label: c.label,
      textColor: c.textColor,
    })),
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://factward.ai";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ClaimReview",
    url: `${baseUrl}/report/${params.id}`,
    claimReviewed: (pack as { overarchingClaim?: string }).overarchingClaim ?? pack.claims[0]?.text ?? "",
    author: {
      "@type": "Organization",
      name: "Factward",
      url: baseUrl,
    },
    datePublished: pack.createdAt,
    reviewRating: {
      "@type": "Rating",
      ratingValue: stats.overarchingScore,
      bestRating: 100,
      worstRating: 0,
      alternateName: stats.overarchingScore >= 80 ? "Verified" : stats.overarchingScore >= 50 ? "Mostly Supported" : stats.overarchingScore >= 30 ? "Mixed" : "Poorly Supported",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReportClient pack={pack} packId={params.id} stats={stats} version={VERSION} decay={decayData} />
    </>
  );
}
