import { EvidencePackSchema, type EvidencePack } from "@factward/core";
import { extractClaims } from "./claim-extractor";
import { classifyClaim } from "./classifier";
import { retrieveEvidence } from "./retrieval";

const ENGINE_VERSION = process.env.ENGINE_VERSION ?? "1.0.0-lite";
const MAX_INPUT_LENGTH_FREE = 10_000;
const MAX_INPUT_LENGTH_PRO = 15_000;
const MAX_CLAIMS_FREE = 5;
const MAX_CLAIMS_PRO = 15;

export type VerificationTelemetry = {
  jobId: string;
  totalDurationMs: number;
  llmDurationMs: number;
  retrievalDurationMs: number;
  claimsCount: number;
  evidenceCount: number;
  engineVersion: string;
  inputLength: number;
  errorType: string | null;
};

/**
 * Validates that an extracted claim is grounded in the original text.
 * Uses simple word-overlap heuristic to catch fabricated claims.
 */
function isClaimGroundedInText(claim: string, originalText: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);

  const claimWords = normalize(claim);
  const textWords = new Set(normalize(originalText));

  if (claimWords.length === 0) return false;

  const matchCount = claimWords.filter((w) => textWords.has(w)).length;
  const overlapRatio = matchCount / claimWords.length;

  // At least 40% of meaningful claim words should appear in the source text
  return overlapRatio >= 0.4;
}

export async function runVerification(
  text: string,
  jobId: string,
  options?: { onTelemetry?: (telemetry: VerificationTelemetry) => void; isPro?: boolean }
): Promise<EvidencePack> {
  const startTime = Date.now();
  let llmDurationMs = 0;
  let retrievalDurationMs = 0;
  let claimsCount = 0;
  let evidenceCount = 0;

  const isPro = options?.isPro ?? false;
  const MAX_INPUT_LENGTH = isPro ? MAX_INPUT_LENGTH_PRO : MAX_INPUT_LENGTH_FREE;
  const MAX_CLAIMS = isPro ? MAX_CLAIMS_PRO : MAX_CLAIMS_FREE;

  try {
    if (text.length > MAX_INPUT_LENGTH) {
      throw Object.assign(
        new Error(
          `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters (received ${text.length})`
        ),
        { type: "INPUT_TOO_LONG" }
      );
    }

    const packId = crypto.randomUUID();

    // Step 1: Extract claims from text
    const extractStart = Date.now();
    const rawClaimTexts = (await extractClaims(text, MAX_CLAIMS)).slice(0, MAX_CLAIMS);
    llmDurationMs += Date.now() - extractStart;

    // Step 1b: Filter out claims not grounded in the original text (anti-hallucination)
    const claimTexts = rawClaimTexts.filter((claim) => isClaimGroundedInText(claim, text));

    if (claimTexts.length === 0 && rawClaimTexts.length > 0) {
      // All claims were filtered — something went wrong with extraction
      // Fall back to the raw claims rather than returning empty
      claimTexts.push(...rawClaimTexts.slice(0, MAX_CLAIMS));
    }

    // Step 2: For each claim, retrieve evidence FIRST, then classify WITH evidence
    const claimsWithEvidence = await Promise.all(
      claimTexts.map(async (claimText) => {
        const claimId = crypto.randomUUID();

        // Step 2a: Retrieve evidence first
        let claimEvidence: Awaited<ReturnType<typeof retrieveEvidence>> = [];
        const retrievalStart = Date.now();
        try {
          claimEvidence = await retrieveEvidence(claimText);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "retrieval failed";
          console.error(
            JSON.stringify({
              level: "warn",
              jobId,
              event: "claim_retrieval_failed",
              error: msg,
            })
          );
        }
        retrievalDurationMs += Date.now() - retrievalStart;

        // Step 2b: Classify WITH the retrieved evidence
        const classificationStart = Date.now();
        let result: Awaited<ReturnType<typeof classifyClaim>>;
        try {
          result = await classifyClaim(claimText, claimEvidence);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "classification failed";
          console.error(
            JSON.stringify({
              level: "warn",
              jobId,
              event: "claim_classification_failed",
              error: msg,
            })
          );
          result = {
            status: "insufficient" as const,
            confidence: 0,
            llmClassification: "insufficient" as const,
            reasoning: "Classification failed. Defaulted to insufficient evidence.",
          };
        }
        llmDurationMs += Date.now() - classificationStart;

        return {
          id: claimId,
          packId,
          text: claimText,
          status: result.status,
          confidence: result.confidence,
          reasoning: result.reasoning,
          evidence: claimEvidence,
        };
      })
    );

    claimsCount = claimsWithEvidence.length;

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

    evidenceCount = flattenedEvidence.length;

    const pack = {
      id: packId,
      jobId,
      claims: claimsWithEvidence,
      evidence: flattenedEvidence,
      createdAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
    };

    EvidencePackSchema.parse(pack);

    const telemetry: VerificationTelemetry = {
      jobId,
      totalDurationMs: Date.now() - startTime,
      llmDurationMs,
      retrievalDurationMs,
      claimsCount,
      evidenceCount,
      engineVersion: ENGINE_VERSION,
      inputLength: text.length,
      errorType: null,
    };

    console.log(
      JSON.stringify({
        level: "info",
        event: "verification_complete",
        ...telemetry,
      })
    );

    options?.onTelemetry?.(telemetry);
    return pack as EvidencePack;
  } catch (error) {
    const errorType = (error as { type?: string })?.type ?? "UNKNOWN_ERROR";
    const telemetry: VerificationTelemetry = {
      jobId,
      totalDurationMs: Date.now() - startTime,
      llmDurationMs,
      retrievalDurationMs,
      claimsCount,
      evidenceCount,
      engineVersion: ENGINE_VERSION,
      inputLength: text.length,
      errorType,
    };

    console.error(
      JSON.stringify({
        level: "error",
        event: "verification_failed",
        ...telemetry,
        error: error instanceof Error ? error.message : "Unknown verification failure",
      })
    );

    options?.onTelemetry?.(telemetry);
    throw error;
  }
}
