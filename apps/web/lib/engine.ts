import { EvidencePackSchema, type EvidencePack } from "@factward/core";
import { extractClaims } from "./claim-extractor";
import { classifyClaim } from "./classifier";
import { retrieveEvidence } from "./retrieval";

const ENGINE_VERSION = process.env.ENGINE_VERSION ?? "2.0.0-thesis";
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
    if (text.trim().length < 50) {
      throw Object.assign(
        new Error(
          "Input is too short for meaningful verification (minimum 50 characters)"
        ),
        { type: "INPUT_TOO_SHORT" }
      );
    }

    if (text.length > MAX_INPUT_LENGTH) {
      throw Object.assign(
        new Error(
          `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters (received ${text.length})`
        ),
        { type: "INPUT_TOO_LONG" }
      );
    }

    const packId = crypto.randomUUID();

    // === PHASE 1: Thesis Identification + Sub-Claim Decomposition ===
    // The AI first identifies the overarching claim, then breaks it into
    // targeted sub-claims that stress-test the thesis from multiple angles.
    const extractStart = Date.now();
    const extraction = await extractClaims(text, MAX_CLAIMS);
    llmDurationMs += Date.now() - extractStart;

    const overarchingClaim = extraction.overarchingClaim;
    const rawExtractedClaims = extraction.claims.slice(0, MAX_CLAIMS);

    // Anti-hallucination: filter out claims not grounded in the original text
    const groundedClaims = rawExtractedClaims.filter((claim) =>
      isClaimGroundedInText(claim.text, text)
    );

    // Fall back to raw claims if all were filtered
    const extractedClaims =
      groundedClaims.length === 0 && rawExtractedClaims.length > 0
        ? rawExtractedClaims
        : groundedClaims;

    // === PHASE 2: Evidence Retrieval + Classification ===
    // For each sub-claim, retrieve evidence and classify with granular scoring.
    const claimsWithEvidence = await Promise.all(
      extractedClaims.map(async (extractedClaim) => {
        const claimId = crypto.randomUUID();

        // Step 2a: Retrieve evidence
        let claimEvidence: Awaited<ReturnType<typeof retrieveEvidence>> = [];
        let retrievalFailed = false;
        const retrievalStart = Date.now();
        try {
          claimEvidence = await retrieveEvidence(extractedClaim.text);
        } catch (err: unknown) {
          retrievalFailed = true;
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

        // Step 2b: Classify with granular scoring
        const classificationStart = Date.now();
        let result: Awaited<ReturnType<typeof classifyClaim>>;
        try {
          result = await classifyClaim(extractedClaim.text, claimEvidence);
          // Enhance reasoning when retrieval failed vs simply no results
          if (claimEvidence.length === 0 && retrievalFailed) {
            result = {
              ...result,
              reasoning: "Evidence retrieval encountered an error. This claim could not be verified due to a search failure, not because evidence doesn't exist. Consider re-verifying.",
            };
          }
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
            verdictScore: 0,
            llmClassification: "insufficient" as const,
            reasoning: "Classification failed. Defaulted to insufficient evidence.",
            evidenceBreakdown: { supporting: 0, contradicting: 0, neutral: 0 },
            sourceStances: [],
          };
        }
        llmDurationMs += Date.now() - classificationStart;

        return {
          id: claimId,
          packId,
          text: extractedClaim.text,
          status: result.status,
          confidence: result.confidence,
          reasoning: result.reasoning,
          verdictScore: result.verdictScore,
          subClaimRationale: extractedClaim.rationale,
          evidenceBreakdown: result.evidenceBreakdown,
          evidence: claimEvidence,
          sourceStances: result.sourceStances,
        };
      })
    );

    claimsCount = claimsWithEvidence.length;

    // === PHASE 3: Compute overarching score ===
    // ALL claims contribute to the score. Claims with no evidence score 0,
    // which properly penalizes articles where most claims can't be verified.
    // The score is a weighted average where claims with more evidence carry
    // more weight, but unverifiable claims still count (weight = 1).
    const totalClaims = claimsWithEvidence.length;
    const verifiableClaims = claimsWithEvidence.filter((c) => c.verdictScore > 0 || c.evidence.length > 0);
    const unverifiableCount = totalClaims - verifiableClaims.length;

    let overarchingScore: number;
    if (totalClaims === 0) {
      overarchingScore = 0;
    } else {
      // Weighted average across ALL claims (unverifiable claims contribute 0 with weight 1)
      const weightedSum = claimsWithEvidence.reduce((sum, c) => {
        const weight = Math.max(1, c.evidence.length);
        return sum + c.verdictScore * weight;
      }, 0);
      const totalWeight = claimsWithEvidence.reduce((sum, c) => sum + Math.max(1, c.evidence.length), 0);
      const rawScore = Math.round(weightedSum / totalWeight);

      // Apply a coverage penalty: if most claims are unverifiable, the score
      // should reflect that we can't actually confirm the article's claims.
      // coverage = fraction of claims that have any evidence at all.
      const coverage = verifiableClaims.length / totalClaims;
      // Scale the raw score by coverage so 4/15 verified caps the score much lower
      overarchingScore = Math.round(rawScore * coverage);
    }

    const coverageRatio = totalClaims > 0 ? verifiableClaims.length / totalClaims : 0;
    const overarchingVerdict =
      coverageRatio < 0.3
        ? "Insufficient evidence — most claims could not be verified against web sources."
        : coverageRatio < 0.5
          ? "Limited verification — fewer than half the claims have supporting evidence."
          : overarchingScore >= 75
            ? "The central thesis is well supported by evidence."
            : overarchingScore >= 50
              ? "The central thesis has mixed support — some sub-claims hold up, others are questionable."
              : overarchingScore >= 25
                ? "The central thesis is poorly supported — most sub-claims lack strong evidence."
                : "The central thesis is largely contradicted by available evidence.";

    // Build evidence array with stance annotations
    const flattenedEvidence = claimsWithEvidence.flatMap((claim) =>
      claim.evidence.map((item, idx) => {
        const stanceEntry = claim.sourceStances.find((s) => s.sourceNumber === idx + 1);
        return {
          id: crypto.randomUUID(),
          claimId: claim.id,
          sourceUrl: item.sourceUrl,
          snippet: item.quotedSpan,
          relevanceScore: 1,
          sourceTitle: item.sourceTitle,
          quotedSpan: item.quotedSpan,
          retrievedAt: item.retrievedAt,
          stance: stanceEntry?.stance,
        };
      })
    );

    evidenceCount = flattenedEvidence.length;

    const pack = {
      id: packId,
      jobId,
      claims: claimsWithEvidence.map((c) => ({
        id: c.id,
        packId: c.packId,
        text: c.text,
        status: c.status,
        confidence: c.confidence,
        reasoning: c.reasoning,
        verdictScore: c.verdictScore,
        subClaimRationale: c.subClaimRationale,
        evidenceBreakdown: c.evidenceBreakdown,
      })),
      evidence: flattenedEvidence,
      createdAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      overarchingClaim,
      overarchingScore,
      overarchingVerdict,
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
