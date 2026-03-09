import { z } from "zod";
import { callLLM } from "./llm";
import type { RetrievedEvidence } from "./retrieval";

// Maps LLM raw classification keys to ClaimStatus values defined in
// @proofmode/core ClaimSchema: z.enum(["supported", "mixed", "unsupported"])
// DO NOT add new values here without updating packages/core/src/schema.ts first.
const LLM_CLASSIFICATION_MAP = {
  supported: "supported",
  refuted: "unsupported",
  not_enough_info: "mixed",
} as const;

type LLMClassification = keyof typeof LLM_CLASSIFICATION_MAP;
export type ClaimStatus = (typeof LLM_CLASSIFICATION_MAP)[LLMClassification];

const SYSTEM_PROMPT = `You are a rigorous, conservative fact-checker. Classify a single factual claim based STRICTLY on the provided evidence.

Rules:
- You will receive a claim and a set of evidence snippets retrieved from web sources.
- "supported": the evidence clearly and directly supports the claim. Multiple independent sources agree.
- "refuted": the evidence clearly and directly contradicts the claim.
- "not_enough_info": DEFAULT. Use this when:
  - The evidence is absent, ambiguous, or insufficient
  - The evidence only partially addresses the claim
  - You are not highly confident in either direction
  - The claim is about a topic where the evidence is outdated or unclear

CRITICAL RULES — follow these exactly:
- Base your classification ONLY on the provided evidence snippets, NOT on your internal knowledge.
- If no evidence is provided, you MUST return "not_enough_info" with confidence 0.
- If evidence is provided but does not directly address the specific claim, return "not_enough_info".
- Never classify as "supported" unless the evidence explicitly backs the claim.
- Never classify as "refuted" unless the evidence explicitly contradicts the claim.
- Be conservative: when in doubt, ALWAYS choose "not_enough_info".
- Confidence should reflect how strongly the evidence supports your classification (0.0 = no evidence, 1.0 = overwhelming evidence).

Return ONLY valid JSON: {"classification": "supported"|"refuted"|"not_enough_info", "confidence": 0.0, "reasoning": "brief explanation of how evidence supports your verdict"}
No prose outside the JSON.`;

const ClassificationSchema = z.object({
  classification: z.enum(["supported", "refuted", "not_enough_info"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

export interface ClassificationResult {
  status: ClaimStatus;
  confidence: number;
  llmClassification: LLMClassification;
  reasoning: string;
}

function formatEvidenceContext(evidence: RetrievedEvidence[]): string {
  if (evidence.length === 0) {
    return "NO EVIDENCE RETRIEVED. You must return not_enough_info with confidence 0.";
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

  // Safety net: if no evidence was provided, force not_enough_info regardless of LLM output
  if (evidence.length === 0 && llmClassification !== "not_enough_info") {
    return {
      status: "mixed",
      confidence: 0,
      llmClassification: "not_enough_info",
      reasoning: "No web evidence retrieved. Classification defaulted to not_enough_info.",
    };
  }

  return {
    status,
    confidence: parsed.confidence,
    llmClassification,
    reasoning: parsed.reasoning ?? "",
  };
}
