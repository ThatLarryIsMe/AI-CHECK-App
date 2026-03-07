import { EvidencePackSchema, type EvidencePack } from "@proofmode/core";
import { extractClaims } from "./claim-extractor";
import { classifyClaim } from "./classifier";
import { retrieveEvidence } from "./retrieval";

const ENGINE_VERSION = process.env.ENGINE_VERSION ?? "1.0.0-lite";
const MAX_INPUT_LENGTH_FREE = 5_000;
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

    const extractStart = Date.now();
    const claimTexts = (await extractClaims(text, MAX_CLAIMS)).slice(0, MAX_CLAIMS);
    llmDurationMs += Date.now() - extractStart;

    const claimsWithEvidence = await Promise.all(
      claimTexts.map(async (claimText) => {
        const claimId = crypto.randomUUID();

        const classificationPromise = (async () => {
          const classificationStart = Date.now();
          try {
            return await classifyClaim(claimText);
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
            return { status: "mixed" as const, confidence: 0 };
          } finally {
            llmDurationMs += Date.now() - classificationStart;
          }
        })();

        const evidencePromise = (async () => {
          const retrievalStart = Date.now();
          try {
            return await retrieveEvidence(claimText);
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
            return [];
          } finally {
            retrievalDurationMs += Date.now() - retrievalStart;
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
