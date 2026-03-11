import type { Metadata } from "next";
import { getPack } from "@/lib/jobs-db";
import { VERSION } from "@/../../version";
import { ReportClient } from "./report-client";
import { analyzePackDecay } from "@/lib/decay";

interface PageProps {
  params: { id: string };
}

function computeStats(pack: { claims: Array<{ status: string; confidence: number }> }) {
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

  // Trust Score: conservative formula based only on verifiable claims.
  // Only claims with actual evidence count toward the score.
  // "insufficient" claims are excluded from both numerator AND denominator
  // so they don't inflate or deflate the score — they're simply unverifiable.
  const verifiable = supported + mixed + unsupported;
  const trustScore =
    verifiable > 0
      ? Math.round((supported / verifiable) * 100)
      : 0;

  return { total, supported, mixed, unsupported, insufficient, avgConfidence, trustScore };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pack = await getPack(params.id);
  if (!pack) {
    return { title: "Report Not Found — Factward" };
  }

  const { total, supported, unsupported, trustScore } = computeStats(pack);

  const title = `Factward Report — ${trustScore}% Trust Score`;
  const description = `${total} claims analyzed: ${supported} supported, ${unsupported} unsupported. Verified by Factward AI fact-checking.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Factward",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ReportPage({ params }: PageProps) {
  // Server-side fetch for instant load + SEO
  const pack = await getPack(params.id);

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

  return <ReportClient pack={pack} packId={params.id} stats={stats} version={VERSION} decay={decayData} />;
}
