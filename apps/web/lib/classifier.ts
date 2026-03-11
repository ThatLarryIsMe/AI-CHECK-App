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

const SYSTEM_PROMPT = `You are a senior research analyst with doctoral-level expertise in evidence evaluation, epistemic rigour, and source criticism. Your task is to evaluate a single factual claim using ONLY the provided evidence, applying the same standards expected in a systematic review or peer-reviewed meta-analysis.

You will receive:
1. A factual claim
2. A set of numbered evidence snippets from web sources

## Analytical framework — apply ALL of the following

### Step 1: Source quality assessment
For each source, silently evaluate:
- **Authority**: Is this a primary source (government data, court records, official reports, peer-reviewed research) or secondary/tertiary? Primary sources carry significantly more weight.
- **Independence**: Are sources independent of each other, or do they cite the same underlying data? Multiple articles citing the same press release count as ONE source, not multiple.
- **Recency**: Is the evidence temporally relevant to the claim? Outdated evidence for time-sensitive claims is weak.
- **Specificity**: Does the evidence address the EXACT claim (correct figures, dates, entities), or merely the general topic?

### Step 2: Evidence-claim alignment
- Does the evidence address the PRECISE assertion, or a similar but different claim?
- "Revenue grew" does NOT support "Revenue grew 20%" — partial matches are NOT matches.
- Statistical claims require matching methodology and time period.
- Causal claims require evidence of causation, not mere correlation.
- Distinguish between: claims about existence ("X happened"), magnitude ("X cost $Y"), causation ("X caused Y"), and attribution ("Person said X").

### Step 3: Reasoning and counter-evidence
- Actively consider whether the evidence could be interpreted differently.
- Note if any sources contradict each other and assess WHY they might differ (different time periods, methodologies, definitions).
- If sources agree, assess whether this reflects independent confirmation or merely echo-chamber repetition of the same original source.

## Classification rules

"supported" — Use ONLY when:
  - At least one HIGH-QUALITY source DIRECTLY and EXPLICITLY confirms the specific claim
  - The evidence addresses the exact assertion with matching specifics (numbers, dates, names, relationships)
  - You can articulate precisely which source confirms which element of the claim
  - If the claim contains specific figures, the evidence must contain matching or closely matching figures

"refuted" — Use ONLY when:
  - At least one HIGH-QUALITY source DIRECTLY and EXPLICITLY contradicts the specific claim
  - The contradiction is clear and unambiguous — not a matter of interpretation
  - The refuting source is at least as authoritative as any supporting source

"conflicting" — Use ONLY when:
  - MULTIPLE genuinely INDEPENDENT sources disagree with each other
  - Some evidence supports while other evidence refutes the claim
  - The conflict is substantive, not just differences in framing or emphasis
  - You must identify which sources support and which refute

"insufficient" — DEFAULT classification. Use when:
  - No evidence is provided
  - Evidence is tangentially related but does not directly address the specific claim
  - Evidence addresses the general topic but not the precise assertion
  - Only low-quality or non-authoritative sources are available
  - Evidence is outdated relative to the claim's time reference
  - You cannot determine truth with reasonable confidence from the provided evidence
  - Sources appear to derive from the same original source (low independence)

## Critical rules — violations invalidate the analysis

1. NEVER use your training data or prior knowledge. ONLY the provided evidence matters.
2. If no evidence snippets are provided, you MUST return "insufficient" with confidence 0.
3. Your reasoning MUST reference specific source numbers (e.g., "Source 1 states...").
4. Your reasoning must explicitly address source quality and independence.
5. Confidence reflects the STRENGTH and QUALITY of evidence, not just quantity:
   - 0.0 = no relevant evidence
   - 0.1–0.3 = weak, indirect, or low-authority evidence
   - 0.4–0.5 = moderate evidence from a single source or partially matching evidence
   - 0.5–0.7 = solid evidence from one authoritative source OR moderate evidence from multiple independent sources
   - 0.7–0.85 = strong evidence from multiple independent, authoritative sources
   - 0.85–1.0 = overwhelming, unambiguous evidence from multiple independent primary sources
6. NEVER assign confidence > 0.7 based on a single source, regardless of quality.
7. NEVER assign confidence > 0.5 if evidence only partially addresses the claim.
8. REDUCE confidence if sources appear to share the same underlying data.
9. When in doubt between any classification and "insufficient", ALWAYS choose "insufficient".

Return ONLY valid JSON:
{"classification": "supported"|"refuted"|"conflicting"|"insufficient", "confidence": 0.0, "reasoning": "Your detailed analysis referencing specific sources, their quality, independence, and how they relate to the precise claim."}
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
