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
For each source, evaluate:
- **Authority**: Is this a primary source (government data, court records, official reports, peer-reviewed research) or secondary/tertiary? Primary sources carry significantly more weight.
- **Independence**: Are sources independent of each other, or do they cite the same underlying data? Multiple articles citing the same press release count as ONE source, not multiple.
- **Recency**: Is the evidence temporally relevant to the claim? Outdated evidence for time-sensitive claims is weak.
- **Specificity**: Does the evidence address the EXACT claim (correct figures, dates, entities), or merely the general topic?

### Step 2: Evidence stance classification
For EACH source, determine its stance relative to the claim:
- **Supporting**: The source directly confirms or provides evidence for the claim
- **Contradicting**: The source directly refutes or provides counter-evidence to the claim
- **Neutral**: The source is related but does not clearly support or contradict (tangential, ambiguous, or about the topic but not the specific assertion)

You MUST classify every source into one of these three stances.

### Step 3: Evidence-claim alignment
- Does the evidence address the PRECISE assertion, or a similar but different claim?
- "Revenue grew" does NOT support "Revenue grew 20%" — partial matches are NOT matches.
- Statistical claims require matching methodology and time period.
- Causal claims require evidence of causation, not mere correlation.

### Step 4: Verdict scoring (0-100)
Based on the balance, quality, and independence of evidence, assign a score:
- **90-100**: Strongly verified — multiple independent, authoritative sources directly confirm with matching specifics
- **75-89**: Well supported — at least one authoritative source directly confirms; no credible contradictions
- **60-74**: Mostly supported — evidence leans toward confirmation but with some gaps or caveats
- **45-59**: Mixed — credible evidence exists on both sides, or evidence partially matches
- **30-44**: Mostly unsupported — evidence leans toward refutation or significant gaps in support
- **15-29**: Poorly supported — weak, indirect, or mostly contradictory evidence
- **0-14**: Refuted — strong, authoritative evidence directly contradicts the claim
- **null**: Unverifiable — insufficient evidence to make any determination

### Step 5: Reasoning and counter-evidence
- Actively consider whether the evidence could be interpreted differently.
- Note if any sources contradict each other and assess WHY they might differ.
- If sources agree, assess whether this reflects independent confirmation or echo-chamber repetition.

## Classification rules (derive from verdict score)

"supported" — verdictScore >= 60
"refuted" — verdictScore <= 29 (and verdictScore is not null)
"conflicting" — verdictScore 30-59
"insufficient" — verdictScore is null (not enough evidence)

## Critical rules — violations invalidate the analysis

1. NEVER use your training data or prior knowledge. ONLY the provided evidence matters.
2. If no evidence snippets are provided, you MUST return "insufficient" with verdictScore null and all stance counts at 0.
3. Your reasoning MUST reference specific source numbers (e.g., "Source 1 states...").
4. Your reasoning must explicitly address source quality and independence.
5. You MUST classify the stance (supporting/contradicting/neutral) for EVERY source.
6. NEVER assign verdictScore > 70 based on a single source, regardless of quality.
7. NEVER assign verdictScore > 50 if evidence only partially addresses the claim.
8. REDUCE verdictScore if sources appear to share the same underlying data.
9. When in doubt, use a lower score rather than a higher one.

Return ONLY valid JSON:
{"classification": "supported"|"refuted"|"conflicting"|"insufficient", "verdictScore": 0-100|null, "supporting": 0, "contradicting": 0, "neutral": 0, "sourceStances": [{"sourceNumber": 1, "stance": "supporting"|"contradicting"|"neutral"}], "reasoning": "Your detailed analysis referencing specific sources, their quality, independence, and how they relate to the precise claim."}
No prose outside the JSON.`;

const SourceStanceSchema = z.object({
  sourceNumber: z.number(),
  stance: z.enum(["supporting", "contradicting", "neutral"]),
});

const ClassificationSchema = z.object({
  classification: z.enum(["supported", "refuted", "conflicting", "insufficient"]),
  verdictScore: z.number().min(0).max(100).nullable(),
  supporting: z.number().min(0),
  contradicting: z.number().min(0),
  neutral: z.number().min(0),
  sourceStances: z.array(SourceStanceSchema).optional(),
  reasoning: z.string(),
});

export interface EvidenceBreakdown {
  supporting: number;
  contradicting: number;
  neutral: number;
}

export interface ClassificationResult {
  status: ClaimStatus;
  confidence: number;
  verdictScore: number;
  llmClassification: LLMClassification;
  reasoning: string;
  evidenceBreakdown: EvidenceBreakdown;
  sourceStances: Array<{ sourceNumber: number; stance: "supporting" | "contradicting" | "neutral" }>;
}

function formatEvidenceContext(evidence: RetrievedEvidence[]): string {
  if (evidence.length === 0) {
    return "NO EVIDENCE RETRIEVED. You MUST return insufficient with verdictScore null and all stance counts at 0.";
  }

  return evidence
    .map(
      (e, i) =>
        `[Source ${i + 1}] ${e.sourceTitle}\nURL: ${e.sourceUrl}\nSnippet: ${e.quotedSpan}`
    )
    .join("\n\n");
}

/**
 * Convert verdict score (0-100) to the legacy ClaimStatus for backward compat.
 */
function verdictScoreToStatus(score: number | null): ClaimStatus {
  if (score === null) return "insufficient";
  if (score >= 60) return "supported";
  if (score >= 30) return "mixed";
  return "unsupported";
}

/**
 * Convert verdict score to a legacy confidence value (0-1) for backward compat.
 */
function verdictScoreToConfidence(score: number | null): number {
  if (score === null) return 0;
  return Math.round(score) / 100;
}

export async function classifyClaim(
  claim: string,
  evidence: RetrievedEvidence[] = []
): Promise<ClassificationResult> {
  // Skip LLM call entirely when there's no evidence — saves cost and latency
  if (evidence.length === 0) {
    return {
      status: "insufficient",
      confidence: 0,
      verdictScore: 0,
      llmClassification: "insufficient",
      reasoning: "No web evidence was retrieved for this claim. Cannot verify without sources.",
      evidenceBreakdown: { supporting: 0, contradicting: 0, neutral: 0 },
      sourceStances: [],
    };
  }

  const evidenceContext = formatEvidenceContext(evidence);
  const userMessage = `Claim: "${claim}"\n\nEvidence:\n${evidenceContext}`;

  // Classification is the most critical step — use the full gpt-4o model
  const raw = await callLLM(SYSTEM_PROMPT, userMessage, "gpt-4o");
  const parsed = ClassificationSchema.parse(raw);
  const llmClassification = parsed.classification;

  // Safety net: reasoning must reference at least one source
  const mentionsSources = /source\s*\d/i.test(parsed.reasoning);
  if (!mentionsSources && llmClassification !== "insufficient") {
    return {
      status: "insufficient",
      confidence: 0,
      verdictScore: 0,
      llmClassification: "insufficient",
      reasoning: `Classifier failed to cite evidence. Original response: ${parsed.reasoning}`,
      evidenceBreakdown: { supporting: 0, contradicting: 0, neutral: 0 },
      sourceStances: [],
    };
  }

  const verdictScore = parsed.verdictScore ?? 0;

  // Safety net: cap score for single-source verdicts
  const cappedScore =
    evidence.length === 1 && verdictScore > 70
      ? 70
      : verdictScore;

  // Derive status from the verdict score (not from the LLM classification directly)
  // This ensures consistency between the score and the categorical label
  const status = verdictScoreToStatus(parsed.verdictScore);
  const confidence = verdictScoreToConfidence(cappedScore);

  return {
    status,
    confidence,
    verdictScore: cappedScore,
    llmClassification,
    reasoning: parsed.reasoning,
    evidenceBreakdown: {
      supporting: parsed.supporting,
      contradicting: parsed.contradicting,
      neutral: parsed.neutral,
    },
    sourceStances: parsed.sourceStances ?? [],
  };
}
