import { z } from "zod";
import { callLLM } from "./llm";

const SYSTEM_PROMPT = `You are a doctoral-level research analyst specializing in claim identification and decomposition for systematic fact-checking. Given a passage of text, extract the most important atomic factual claims that can be independently verified against external evidence.

## Extraction methodology

Apply the following analytical framework:

1. **Identify verifiable assertions**: Focus on claims that make specific, falsifiable statements about the world — statements that are either true or false regardless of perspective.

2. **Decompose compound claims**: If a sentence makes multiple assertions (e.g., "Company X reported $5B revenue, up 20% year-over-year"), split into separate atomic claims ("Company X reported $5B revenue" and "Company X revenue grew 20% year-over-year").

3. **Preserve specificity**: Retain exact figures, dates, names, and quantifiers. "GDP grew significantly" is less useful than "GDP grew 3.2% in Q3 2024." Extract the most specific version stated in the text.

4. **Prioritize by verifiability and significance**:
   - HIGH priority: Statistical claims, historical facts, attribution of statements, cause-effect assertions, legal/regulatory claims
   - MEDIUM priority: Comparative claims, trend descriptions, institutional relationships
   - LOW priority (skip): Opinions, predictions, subjective assessments, rhetorical questions, trivially obvious facts

5. **Contextual completeness**: Each claim must be fully self-contained. A reader with no knowledge of the source text should understand exactly what is being asserted. Add necessary context (who, what, when) if the original sentence relies on context from surrounding text.

## Rules
- Each claim must be a single, self-contained factual assertion that can be independently verified.
- CRITICAL: Only extract claims that are ACTUALLY STATED in the text. Do NOT add, infer, or fabricate claims that the text does not make. Every claim must be directly traceable to a specific sentence or passage in the input.
- Do not include opinions, predictions, questions, or subjective statements.
- Do not include trivially true or obvious claims.
- Return ONLY valid JSON in this exact format: {"claims": ["claim 1", "claim 2"]}
- No prose, no markdown, no explanation outside the JSON object.`;

function buildPrompt(maxClaims: number): string {
  return `${SYSTEM_PROMPT}\n- Extract up to ${maxClaims} claims maximum. Prioritize the most significant and verifiable ones.`;
}

const ClaimArraySchema = z.object({
    claims: z.array(z.string().min(1)).min(1).max(20),
});

export async function extractClaims(text: string, maxClaims: number = 5): Promise<string[]> {
    const raw = await callLLM(buildPrompt(maxClaims), text);
    const parsed = ClaimArraySchema.parse(raw);
    return parsed.claims.slice(0, maxClaims);
}
