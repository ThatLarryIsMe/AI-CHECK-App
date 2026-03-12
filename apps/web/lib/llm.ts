import { z } from "zod";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const LLM_TIMEOUT_MS = 30_000;

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return key;
}

const LLMJsonResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

/**
 * Call the OpenAI chat completions API.
 *
 * @param model — defaults to "gpt-4o-mini" for lightweight tasks.
 *   Use "gpt-4o" only for classification where reasoning quality matters.
 *   This keeps costs ~15x lower for extraction/query-generation calls.
 */
export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  model: "gpt-4o" | "gpt-4o-mini" = "gpt-4o-mini"
): Promise<unknown> {
  const apiKey = getApiKey();

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, LLM_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("abort"))
    ) {
      throw Object.assign(new Error("LLM request timed out after 30s"), {
        type: "LLM_TIMEOUT",
      });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const raw = await response.json();
  const parsed = LLMJsonResponseSchema.parse(raw);
  const content = parsed.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty content");
  }

  let result: unknown;
  try {
    result = JSON.parse(content);
  } catch {
    throw new Error(`LLM returned non-JSON content: ${content.slice(0, 200)}`);
  }

  return result;
}
