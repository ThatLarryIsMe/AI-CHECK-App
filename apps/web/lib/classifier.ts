import { z } from "zod";
import { callLLM } from "./llm";
import type { RetrievedEvidence } from "./retrieval";

// Maps LLM raw classification keys to ClaimStatus values defined in
// @factward/core ClaimSchema: z.enum(["supported", "mixed", "unsupported"])
// DO NOT add new values here without updating packages/core/src/schema.ts first.
//
// Semantics:
//   "supported"   — Evidence directly confirms the claim
//   "unsupported" — Evidence directly contradicts the claim
//   "mixed"       — Evidence is conflicting: some sources support, others refute
//   "insufficient"— Not enough relevant evidence to make any determination
const LLM_CLASSIFICATION_MAP = {
  supported: "supported",
  refuted: "unsupported",
  conflicting: "mixed",
  insufficient: "insufficient",
} as const;

type LLMClassification = keyof typeof LLM_CLASSIFICATION_MAP;
export type ClaimStatus = (typeof LLM_CLASSIFICATION_MAP)[LLMClassification];

const SYSTEM_PROMPT = `You are a rigorous academic fact-checker operating at peer-review standards. You classify a single factual claim based EXCLUSIVELY on the provided evidence.

You will receive:
1. A factual claim
2. A set of numbered evidence snippets from web sources

Your task: determine whether the evidence supports, refutes, or conflicts on the claim.

## Classification rules

"supported" — Use ONLY when:
  - At least one source DIRECTLY and EXPLICITLY confirms the specific claim
  - The evidence must address the exact assertion (correct numbers, dates, names, relationships)
  - Partial matches do NOT count. "Revenue grew" does not support "Revenue grew 20%"
  - You must cite which source(s) confirm it in your reasoning

"refuted" — Use ONLY when:
  - At least one source DIRECTLY and EXPLICITLY contradicts the specific claim
  - The contradiction must be clear and unambiguous
  - You must cite which source(s) contradict it in your reasoning

"conflicting" — Use ONLY when:
  - MULTIPLE sources are found AND they genuinely disagree with each other
  - Some evidence supports the claim while other evidence refutes it
  - This is NOT a default — it requires actual conflicting evidence
  - You must cite which sources support and which refute in your reasoning

"insufficient" — DEFAULT. Use when:
  - No evidence is provided
  - The evidence does not directly address the specific claim
  - The evidence is tangentially related but doesn't confirm or deny
  - Only one vague or indirect source touches on the topic
  - The evidence addresses a similar but different claim
  - You cannot determine the claim's truth from the provided evidence

## Critical rules — violations make the output useless

1. NEVER use your training data or internal knowledge. ONLY the provided evidence matters.
2. If no evidence snippets are provided, you MUST return "insufficient" with confidence 0.
3. Your reasoning MUST reference specific source numbers (e.g., "Source 1 states...").
4. Confidence must reflect evidence strength:
   - 0.0 = no relevant evidence
   - 0.1–0.3 = weak or indirect evidence
   - 0.4–0.6 = moderate evidence, single source
   - 0.7–0.8 = strong evidence from multiple sources
   - 0.9–1.0 = overwhelming, unambiguous evidence from multiple independent sources
5. NEVER assign confidence > 0.7 based on a single source.
6. NEVER assign confidence > 0.5 if the evidence only partially addresses the claim.
7. When in doubt between any classification and "insufficient", ALWAYS choose "insufficient".

Return ONLY valid JSON:
{"classification": "supported"|"refuted"|"conflicting"|"insufficient", "confidence": 0.0, "reasoning": "Which sources say what, and why this leads to your verdict"}
No prose outside the JSON.`;

const ClassificationSchema = z.object({
  classification: z.enum(["supported", "refuted", "conflicting", "insufficient"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export interface ClassificationResult {
  status: ClaimStatus;
  confidence: number;
  llmClassification: LLMClassification;
  reasoning: string;
}

function formatEvidenceContext(evidence: RetrievedEvidence[]): string {
  if (evidence.length === 0) {
    return "NO EVIDENCE RETRIEVED. You MUST return insufficient with confidence 0.";
  }

  return evidence
    .map(
      (e, i) =>
        `[Source ${i + 1}] ${e.sourceTitle}\nURL: ${e.sourceUrl}\nSnippet: ${e.quotedSpan}`
    )
    .join("\n\n");
}

export async function classifyClaim(
  claim: string,
  evidence: RetrievedEvidence[] = []
): Promise<ClassificationResult> {
  const evidenceContext = formatEvidenceContext(evidence);
  const userMessage = `Claim: "${claim}"\n\nEvidence:\n${evidenceContext}`;

  const raw = await callLLM(SYSTEM_PROMPT, userMessage);
  const parsed = ClassificationSchema.parse(raw);
  const llmClassification = parsed.classification;
  const status = LLM_CLASSIFICATION_MAP[llmClassification];

  // Hard safety net: if no evidence was provided, FORCE insufficient regardless of LLM output
  if (evidence.length === 0) {
    return {
      status: "insufficient",
      confidence: 0,
      llmClassification: "insufficient",
      reasoning: "No web evidence was retrieved for this claim. Cannot verify without sources.",
    };
  }

  // Safety net: cap confidence for single-source verdicts
  const cappedConfidence =
    evidence.length === 1 && parsed.confidence > 0.7
      ? 0.7
      : parsed.confidence;

  // Safety net: reasoning must reference at least one source
  const mentionsSources = /source\s*\d/i.test(parsed.reasoning);
  if (!mentionsSources && llmClassification !== "insufficient") {
    return {
      status: "insufficient",
      confidence: 0,
      llmClassification: "insufficient",
      reasoning: `Classifier failed to cite evidence. Original response: ${parsed.reasoning}`,
    };
  }

  return {
    status,
    confidence: cappedConfidence,
    llmClassification,
    reasoning: parsed.reasoning,
  };
}
