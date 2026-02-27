import { EvidencePackSchema, type EvidencePack } from "@proofmode/core";
import { extractClaims } from "./claim-extractor";
import { classifyClaim } from "./classifier";

const ENGINE_VERSION = process.env.ENGINE_VERSION ?? "1.0.0-lite";
const MAX_INPUT_LENGTH = 5_000;

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
  const claimTexts = await extractClaims(text);

  // Step 2: Classify each claim with per-claim failure isolation
  // If one claim fails, mark it not_enough_info and continue others
  const classifiedClaims = await Promise.all(
    claimTexts.map(async (claimText) => {
      let result: { status: string; confidence: number };
      try {
        result = await classifyClaim(claimText);
      } catch (err: unknown) {
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
        result = { status: "not_enough_info", confidence: 0 };
      }
      return {
        id: crypto.randomUUID(),
        packId,
        text: claimText,
        status: result.status as "supported" | "refuted" | "not_enough_info",
        confidence: result.confidence,
      };
    })
  );

  // Step 3: Build EvidencePack (no retrieval in LLM-only mode)
  const pack = {
    id: packId,
    jobId,
    claims: classifiedClaims,
    evidence: [],
    createdAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };

  // Step 4: Validate against core schema before returning
  const validated = EvidencePackSchema.parse(pack);

  // Step 5: Structured log on success
  const supportedCount = classifiedClaims.filter(
    (c) => c.status === "supported"
  ).length;
  const refutedCount = classifiedClaims.filter(
    (c) => c.status === "refuted"
  ).length;
  const neiCount = classifiedClaims.filter(
    (c) => c.status === "not_enough_info"
  ).length;

  console.log(
    JSON.stringify({
      level: "info",
      jobId,
      event: "verification_complete",
      packId,
      claimsTotal: classifiedClaims.length,
      supported: supportedCount,
      refuted: refutedCount,
      not_enough_info: neiCount,
      engineVersion: ENGINE_VERSION,
    })
  );

  return validated;
}
