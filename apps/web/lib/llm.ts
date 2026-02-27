import { z } from "zod";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

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

export async function callLLM(
    systemPrompt: string,
    userMessage: string
  ): Promise<unknown> {
    const apiKey = getApiKey();

  const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userMessage },
                        ],
                temperature: 0,
                response_format: { type: "json_object" },
        }),
  });

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
