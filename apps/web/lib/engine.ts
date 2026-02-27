import { EvidencePackSchema, type EvidencePack } from "@proofmode/core";
import { extractClaims } from "./claim-extractor";
import { classifyClaim } from "./classifier";

const ENGINE_VERSION = process.env.ENGINE_VERSION ?? "1.0.0-lite";

export async function runVerification(
    text: string,
    jobId: string
  ): Promise<EvidencePack> {
    const packId = crypto.randomUUID();

  // Step 1: Extract atomic claims from input text
  const claimTexts = await extractClaims(text);

  // Step 2: Classify each claim (conservative, LLM-only)
  const classifiedClaims = await Promise.all(
        claimTexts.map(async (claimText) => {
        const result = await classifyClaim(claimText);
                return {
                          id: crypto.randomUUID(),
                          packId,
                          text: claimText,
                          status: result.status,
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
  return EvidencePackSchema.parse(pack);
}

// Keep legacy export name for backwards compatibility with route.ts
export { runVerification as runMockEngine };
