import { EvidencePackSchema, type EvidencePack } from "@proofmode/core";
import { extractClaims } from "./claim-extractor";
import { classifyClaim } from "./classifier";
import { retrieveEvidence } from "./retrieval";

const ENGINE_VERSION = process.env.ENGINE_VERSION ?? "1.0.0-lite";
const MAX_INPUT_LENGTH = 5_000;
const MAX_CLAIMS = 5;

export async function runVerification(
  text: string,
  jobId: string
): Promise<EvidencePack> {
  // Guard: reject oversized inputs before any LLM calls
  if (text.length > MAX_INPUT_LENGTH) {
    throw Object.assign(
      new Error(
        `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters (received ${text.length})`
      ),
      { type: "INPUT_TOO_LONG" }
    );
  }

  const packId = crypto.randomUUID();

  // Step 1: Extract atomic claims from input text
  const claimTexts = (await extractClaims(text)).slice(0, MAX_CLAIMS);

  // Step 2: Classify + retrieve evidence with per-claim failure isolation
  const claimsWithEvidence = await Promise.all(
    claimTexts.map(async (claimText) => {
      const claimId = crypto.randomUUID();

      const classificationPromise = classifyClaim(claimText).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "classification failed";
        console.error(
          JSON.stringify({
            level: "warn",
            jobId,
            event: "claim_classification_failed",
            claim: claimText.slice(0, 100),
            error: msg,
          })
        );
        return { status: "mixed" as const, confidence: 0 };
      });

      const evidencePromise = (async () => {
        try {
          return await retrieveEvidence(claimText);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "retrieval failed";
          console.error(
            JSON.stringify({
              level: "warn",
              jobId,
              event: "claim_retrieval_failed",
              claim: claimText.slice(0, 100),
              error: msg,
            })
          );
          return [];
        }
      })();

      const [result, claimEvidence] = await Promise.all([
        classificationPromise,
        evidencePromise,
      ]);

      return {
        id: claimId,
        packId,
        text: claimText,
        status: result.status,
        confidence: result.confidence,
        evidence: claimEvidence,
      };
    })
  );

  const flattenedEvidence = claimsWithEvidence.flatMap((claim) =>
    claim.evidence.map((item) => ({
      id: crypto.randomUUID(),
      claimId: claim.id,
      sourceUrl: item.sourceUrl,
      snippet: item.quotedSpan,
      relevanceScore: 1,
      sourceTitle: item.sourceTitle,
      quotedSpan: item.quotedSpan,
      retrievedAt: item.retrievedAt,
    }))
  );

  const pack = {
    id: packId,
    jobId,
    claims: claimsWithEvidence,
    evidence: flattenedEvidence,
    createdAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };

  // Step 3: Validate shape against core schema before returning
  EvidencePackSchema.parse(pack);

  // Step 4: Structured log on success
  const supportedCount = claimsWithEvidence.filter(
    (c) => c.status === "supported"
  ).length;
  const refutedCount = claimsWithEvidence.filter(
    (c) => c.status === "unsupported"
  ).length;
  const neiCount = claimsWithEvidence.filter((c) => c.status === "mixed").length;

  console.log(
    JSON.stringify({
      level: "info",
      jobId,
      event: "verification_complete",
      packId,
      claimsTotal: claimsWithEvidence.length,
      supported: supportedCount,
      refuted: refutedCount,
      not_enough_info: neiCount,
      retrievalCalls: claimsWithEvidence.length,
      engineVersion: ENGINE_VERSION,
    })
  );

  return pack as EvidencePack;
}
