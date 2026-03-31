import { NextRequest, NextResponse } from "next/server";
import { getPackForUser } from "@/lib/jobs-db";
import { getUserFromRequest } from "@/lib/auth";
import { VERSION } from "@/../../version";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const pack = await getPackForUser(params.id, sessionUser.userId);
  if (!pack) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const claims = pack.claims ?? [];
  const evidence = pack.evidence ?? [];
  const now = new Date().toISOString();
  const hasRetrieval = evidence.length > 0;

  // Totals + counts
  const total = claims.length;
  const supported = claims.filter((c) => c.status === "supported").length;
  const mixed = claims.filter((c) => c.status === "mixed").length;
  const unsupported = claims.filter((c) => c.status === "unsupported").length;
  const insufficient = claims.filter((c) => c.status === "insufficient").length;
  const avgConfidence =
    total > 0
      ? Math.round(
          claims.reduce((sum, c) => sum + (c.confidence ?? 0), 0) / total
        )
      : 0;

  // New scoring fields
  const overarchingClaim = (pack as Record<string, unknown>).overarchingClaim as string | undefined;
  const overarchingScore = (pack as Record<string, unknown>).overarchingScore as number | undefined;
  const overarchingVerdict = (pack as Record<string, unknown>).overarchingVerdict as string | undefined;

  // Build Markdown evidence pack
  const lines: string[] = [
    `# Factward AI — Evidence Pack`,
    ``,
    `**Factward Version:** ${VERSION}`,
    `**Generated At:** ${now}`,
    ``,
    `---`,
    ``,
    `**Pack ID:** ${params.id}`,
    `**Engine Version:** ${pack.engineVersion ?? "llm-only-v1"}`,
    `**Generated:** ${pack.createdAt ?? now}`,
    `**Exported:** ${now}`,
    ``,
    `---`,
    ``,
  ];

  // Add overarching claim section if available
  if (overarchingClaim) {
    lines.push(
      `## Central Thesis`,
      ``,
      `> ${overarchingClaim}`,
      ``,
      `**Overall Score:** ${overarchingScore ?? "N/A"}/100`,
      `**Verdict:** ${overarchingVerdict ?? "N/A"}`,
      ``,
      `---`,
      ``,
    );
  }

  lines.push(
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total sub-claims | ${total} |`,
    `| Supported (score >= 60) | ${supported} |`,
    `| Mixed evidence (score 30-59) | ${mixed} |`,
    `| Refuted (score < 30) | ${unsupported} |`,
    `| Insufficient evidence | ${insufficient} |`,
    `| Avg confidence | ${avgConfidence}% |`,
    `| Evidence sources | ${evidence.length} |`,
    ``,
    `---`,
    ``,
    `## Sub-Claims`,
    ``,
  );

  for (const claim of claims) {
    const claimRecord = claim as Record<string, unknown>;
    lines.push(`### ${claim.text}`);
    lines.push(``);
    if (claimRecord.subClaimRationale) {
      lines.push(`- **Why this matters:** ${claimRecord.subClaimRationale}`);
    }
    lines.push(`- **Verdict Score:** ${claimRecord.verdictScore ?? "N/A"}/100`);
    lines.push(`- **Classification:** ${claim.status}`);
    lines.push(`- **Confidence:** ${Math.round((claim.confidence ?? 0) * 100)}%`);
    if (claimRecord.evidenceBreakdown) {
      const eb = claimRecord.evidenceBreakdown as { supporting: number; contradicting: number; neutral: number };
      lines.push(`- **Evidence:** ${eb.supporting} supporting, ${eb.contradicting} contradicting, ${eb.neutral} neutral`);
    }
    if (claimRecord.reasoning) {
      lines.push(`- **Analysis:** ${claimRecord.reasoning}`);
    }
    lines.push(``);
    lines.push(`#### Evidence`);
    lines.push(``);

    // Match evidence to this claim
    const claimEvidence = evidence.filter((e) => e.claimId === claim.id);
    if (claimEvidence.length > 0) {
      for (const e of claimEvidence) {
        lines.push(`- [${e.sourceUrl}](${e.sourceUrl})`);
        lines.push(`  > ${e.snippet}`);
        lines.push(``);
      }
    } else {
      lines.push(`> No evidence retrieved for this claim.`);
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
  }

  lines.push(`## Method & Limitations`);
  lines.push(``);
  if (hasRetrieval) {
    lines.push(`- **Engine:** ${pack.engineVersion ?? "1.0.0-lite"}`);
    lines.push(
      `- **Retrieval:** Web retrieval was used to find supporting or contradicting sources.`
    );
  } else {
    lines.push(`- **Engine:** LLM-only (${pack.engineVersion ?? "1.0.0-lite"})`);
    lines.push(
      `- **Retrieval:** None — claims were classified by a language model without external source retrieval.`
    );
  }
  lines.push(
    `- **Verdicts** are based exclusively on retrieved web evidence, not on AI internal knowledge.`
  );
  lines.push(
    `- **Confidence scores** reflect evidence strength (0 = no evidence, 1 = overwhelming multi-source evidence).`
  );
  lines.push(
    `- Claims marked "Insufficient evidence" could not be verified or refuted from available sources.`
  );
  lines.push(``);
  lines.push(`## Disclaimer`);
  lines.push(``);
  lines.push(
    `This evidence pack was generated by Factward AI. ` +
      `Do not use as a substitute for professional fact-checking.`
  );
  lines.push(``);

  const markdown = lines.join("\n");

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="evidence-pack-${params.id}.md"`,
    },
  });
}
