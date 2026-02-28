import { z } from "zod";
import { callLLM } from "./llm";

const SYSTEM_PROMPT = `You are a claim extractor. Given a passage of text, extract the atomic factual claims it makes.

Rules:
- Extract 1 to 5 claims maximum.
- Each claim must be a single, self-contained factual assertion.
- Do not include opinions, questions, or non-factual statements.
- Return ONLY valid JSON in this exact format: {"claims": ["claim 1", "claim 2"]}
- No prose, no markdown, no explanation outside the JSON object.`;

const ClaimArraySchema = z.object({
    claims: z.array(z.string().min(1)).min(1).max(5),
});

export async function extractClaims(text: string): Promise<string[]> {
    const raw = await callLLM(SYSTEM_PROMPT, text);
    const parsed = ClaimArraySchema.parse(raw);
    return parsed.claims;
}
