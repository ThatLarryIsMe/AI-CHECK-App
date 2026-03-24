import { z } from "zod";
import { callLLM } from "./llm";

/**
 * Phase 1: Identify the overarching claim / central thesis of the text.
 *
 * Before extracting individual claims, the AI must first understand WHAT
 * the text is fundamentally arguing or asserting. This prevents the
 * "random claim picking" problem where disconnected facts are checked
 * without understanding the bigger picture.
 */
const THESIS_SYSTEM_PROMPT = `You are a doctoral-level research analyst. Your task is to identify the CENTRAL THESIS or overarching claim of a given text.

## What is the central thesis?
The central thesis is the single most important assertion the text is making. It is the claim that, if proven false, would undermine the entire piece. For different text types:

- **News article**: The main story being reported (e.g., "Company X committed fraud" not just "Company X exists")
- **Opinion piece**: The core argument being advanced
- **Research summary**: The primary finding being presented
- **Social media post**: The key factual assertion being shared
- **Mixed content**: The dominant narrative thread connecting the facts

## Rules
- State the thesis as a single, clear, falsifiable assertion
- It must be specific enough to be testable — not vague like "the economy is changing"
- If the text makes no coherent central argument (e.g., a random list of facts), state the dominant topic and frame it as "The text asserts that [dominant theme]"
- Provide a brief explanation of WHY you identified this as the central thesis

Return ONLY valid JSON:
{"thesis": "The central claim in one clear sentence", "reasoning": "Why this is the central thesis (2-3 sentences)"}
No prose outside the JSON.`;

const ThesisSchema = z.object({
  thesis: z.string().min(1),
  reasoning: z.string().min(1),
});

/**
 * Phase 2: Decompose the thesis into sub-claims for stress testing.
 *
 * Given the overarching thesis, break it down into sub-claims that
 * together rigorously test whether the thesis holds up. Each sub-claim
 * attacks the thesis from a different angle.
 */
function buildDecompositionPrompt(maxClaims: number): string {
  return `You are a doctoral-level research analyst specializing in systematic fact-checking. You have been given a text and its identified central thesis. Your job is to decompose this thesis into ${maxClaims} sub-claims that together STRESS TEST whether the thesis holds up.

## Decomposition strategy — stress test from multiple angles

Each sub-claim must attack the thesis from a DIFFERENT angle. Use these categories (select the most relevant ones for the specific thesis):

1. **Factual Foundation**: The bedrock facts the thesis depends on. If these are wrong, the thesis collapses. (e.g., "Did event X actually happen?", "Is statistic Y accurate?")

2. **Causal Logic**: Does the cause-and-effect reasoning hold? (e.g., "Does A actually cause B, or is it correlation?", "Are there confounding factors?")

3. **Source & Attribution**: Are quotes, studies, and sources accurately represented? (e.g., "Did person X actually say Y?", "Does the cited study actually conclude Z?")

4. **Context & Completeness**: Is crucial context missing that would change the conclusion? (e.g., "Is this statistic cherry-picked from a larger dataset?", "Are there important caveats omitted?")

5. **Magnitude & Proportion**: Are the scale, scope, and significance claims accurate? (e.g., "Is '20% increase' accurate?", "Is this actually 'unprecedented' as claimed?")

6. **Temporal Accuracy**: Are dates, timelines, and sequences correct? (e.g., "Did this happen before or after that?", "Is this data current?")

7. **Comparative Claims**: Are comparisons fair and accurate? (e.g., "Is A really bigger/better/worse than B?", "Is this the right comparison group?")

## Rules for each sub-claim

- Each sub-claim must be a single, self-contained factual assertion that can be independently verified
- CRITICAL: Only extract claims ACTUALLY STATED or directly implied in the text. Do NOT fabricate claims
- Each sub-claim must include a "rationale" explaining WHY checking this particular claim matters for evaluating the thesis
- Prioritize claims that would most impact the credibility of the overall thesis if found to be false
- Make claims specific: include exact figures, dates, names, and quantifiers from the text
- Each claim must be fully self-contained — a reader with no context should understand exactly what is being asserted

Return ONLY valid JSON:
{"claims": [{"text": "The specific factual claim", "rationale": "Why this sub-claim matters for testing the thesis (1-2 sentences)", "angle": "factual_foundation|causal_logic|source_attribution|context_completeness|magnitude_proportion|temporal_accuracy|comparative"}]}
No prose outside the JSON. Extract exactly ${maxClaims} sub-claims.`;
}

const SubClaimSchema = z.object({
  text: z.string().min(1),
  rationale: z.string().min(1),
  angle: z.string().min(1),
});

const DecompositionSchema = z.object({
  claims: z.array(SubClaimSchema).min(1).max(20),
});

export interface ExtractedClaim {
  text: string;
  rationale: string;
  angle: string;
}

export interface ExtractionResult {
  overarchingClaim: string;
  overarchingReasoning: string;
  claims: ExtractedClaim[];
}

/**
 * Phase 1: Identify the central thesis of the text.
 */
export async function identifyThesis(text: string): Promise<{ thesis: string; reasoning: string }> {
  const raw = await callLLM(THESIS_SYSTEM_PROMPT, text);
  const parsed = ThesisSchema.parse(raw);
  return parsed;
}

/**
 * Phase 2: Decompose thesis into stress-test sub-claims.
 */
export async function decomposeThesis(
  text: string,
  thesis: string,
  thesisReasoning: string,
  maxClaims: number
): Promise<ExtractedClaim[]> {
  const systemPrompt = buildDecompositionPrompt(maxClaims);
  const userMessage = `## Central Thesis
"${thesis}"
Reasoning: ${thesisReasoning}

## Original Text
${text}`;

  const raw = await callLLM(systemPrompt, userMessage);
  const parsed = DecompositionSchema.parse(raw);
  return parsed.claims.slice(0, maxClaims);
}

/**
 * Full two-phase extraction: thesis identification + sub-claim decomposition.
 *
 * This replaces the old single-pass extraction that picked claims seemingly
 * at random. Now the AI first understands the BIG PICTURE, then systematically
 * breaks it down.
 */
export async function extractClaims(text: string, maxClaims: number = 5): Promise<ExtractionResult> {
  // Phase 1: What is this text really saying?
  const { thesis, reasoning } = await identifyThesis(text);

  // Phase 2: Break it down into testable sub-claims
  const claims = await decomposeThesis(text, thesis, reasoning, maxClaims);

  return {
    overarchingClaim: thesis,
    overarchingReasoning: reasoning,
    claims,
  };
}
