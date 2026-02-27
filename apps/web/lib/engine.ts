import {
  EvidencePackSchema,
  type Claim,
  type Evidence,
  type EvidencePack
} from "@proofmode/core";

const CLAIM_STATUSES: Claim["status"][] = ["supported", "mixed", "unsupported"];

function splitIntoClaims(text: string): string[] {
  const pieces = text
    .split(/[.!?]\s+/)
    .map((piece) => piece.trim())
    .filter(Boolean);

  if (pieces.length === 0) {
    return [
      "No concrete claim provided in input.",
      "Insufficient detail for strong verification."
    ];
  }

  return pieces.slice(0, 3);
}

export async function runMockEngine(text: string): Promise<EvidencePack> {
  const jobId = crypto.randomUUID();
  const packId = crypto.randomUUID();
  const claimTexts = splitIntoClaims(text).slice(0, 3);

  const claims: Claim[] = claimTexts.map((claimText, index) => ({
    id: crypto.randomUUID(),
    packId,
    text: claimText,
    status: CLAIM_STATUSES[index % CLAIM_STATUSES.length]
  }));

  const evidence: Evidence[] = claims.map((claim, index) => ({
    id: crypto.randomUUID(),
    claimId: claim.id,
    sourceUrl: `https://example.com/source-${index + 1}`,
    snippet: `Mock supporting snippet for claim: \"${claim.text}\"`,
    relevanceScore: Math.max(0.35, 0.95 - index * 0.2)
  }));

  const pack = {
    id: packId,
    jobId,
    claims,
    evidence,
    createdAt: new Date().toISOString()
  };

  return EvidencePackSchema.parse(pack);
}
