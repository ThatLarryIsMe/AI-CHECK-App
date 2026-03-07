import { z } from "zod";
import { callLLM } from "./llm";

const SYSTEM_PROMPT = `You are a claim extractor for a fact-checking system. Given a passage of text, extract the most important atomic factual claims it makes.

Rules:
- Each claim must be a single, self-contained factual assertion that can be independently verified.
- Focus on the most significant and verifiable claims — numbers, dates, names, cause-effect statements.
- Do not include opinions, predictions, questions, or subjective statements.
- Do not include trivially true or obvious claims.
- Each claim should make sense on its own without context from the original text.
- Return ONLY valid JSON in this exact format: {"claims": ["claim 1", "claim 2"]}
- No prose, no markdown, no explanation outside the JSON object.`;

function buildPrompt(maxClaims: number): string {
  return `${SYSTEM_PROMPT}\n- Extract up to ${maxClaims} claims maximum. Prioritize the most important ones.`;
}

const ClaimArraySchema = z.object({
    claims: z.array(z.string().min(1)).min(1).max(20),
});

export async function extractClaims(text: string, maxClaims: number = 5): Promise<string[]> {
    const raw = await callLLM(buildPrompt(maxClaims), text);
    const parsed = ClaimArraySchema.parse(raw);
    return parsed.claims.slice(0, maxClaims);
}
