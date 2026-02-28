export interface RetrievedEvidence {
  sourceUrl: string;
  sourceTitle: string;
  quotedSpan: string;
  retrievedAt: string;
}

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const BRAVE_TIMEOUT_MS = 5_000;
const MAX_RESULTS = 3;

interface BraveWebResult {
  url?: string;
  title?: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

export async function retrieveEvidence(
  claim: string
): Promise<RetrievedEvidence[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRAVE_TIMEOUT_MS);

  try {
    const url = `${BRAVE_SEARCH_URL}?q=${encodeURIComponent(claim)}&count=${MAX_RESULTS}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Brave API request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as BraveSearchResponse;
    const retrievedAt = new Date().toISOString();

    return (payload.web?.results ?? [])
      .filter((item): item is Required<Pick<BraveWebResult, "url">> & BraveWebResult => Boolean(item?.url))
      .slice(0, MAX_RESULTS)
      .map((item) => ({
        sourceUrl: item.url,
        sourceTitle: item.title?.trim() || item.url,
        quotedSpan: item.description?.trim() || "No snippet provided by Brave Search.",
        retrievedAt,
      }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown retrieval error";
    console.error(
      JSON.stringify({
        level: "warn",
        event: "brave_retrieval_failed",
        claim: claim.slice(0, 120),
        error: message,
      })
    );
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
