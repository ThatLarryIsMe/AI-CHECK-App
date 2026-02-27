import { z } from "zod";
import { callLLM } from "./llm";

const LLM_CLASSIFICATION_MAP = {
    supported: "supported",
    refuted: "unsupported",
    not_enough_info: "mixed",
} as const;

type LLMClassification = keyof typeof LLM_CLASSIFICATION_MAP;
export type ClaimStatus = (typeof LLM_CLASSIFICATION_MAP)[LLMClassification];

const SYSTEM_PROMPT = `You are a conservative fact-checker. Classify a single factual claim.

Rules:
- "supported": clearly supported by widely accepted facts.
- "refuted": clearly contradicted by widely accepted facts.
- "not_enough_info": default when not highly confident in either direction.

Be conservative: when in doubt, always choose "not_enough_info".

Return ONLY valid JSON: {"classification": "supported"|"refuted"|"not_enough_info", "confidence": 0.0}
confidence is 0 to 1. No prose outside the JSON.`;

const ClassificationSchema = z.object({
    classification: z.enum(["supported", "refuted", "not_enough_info"]),
    confidence: z.number().min(0).max(1),
});

export interface ClassificationResult {
    status: ClaimStatus;
    confidence: number;
    llmClassification: LLMClassification;
}

export async function classifyClaim(
    claim: string
  ): Promise<ClassificationResult> {
    const raw = await callLLM(
      SYSTEM_PROMPT,
          `Classify this claim: "${claim}"`
        );
    const parsed = ClassificationSchema.parse(raw);
    const llmClassification = parsed.classification;
    const status = LLM_CLASSIFICATION_MAP[llmClassification];
    return { status, confidence: parsed.confidence, llmClassification };
}
