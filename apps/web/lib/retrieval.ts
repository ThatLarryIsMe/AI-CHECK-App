import { callLLM } from "./llm";

export interface RetrievedEvidence {
  sourceUrl: string;
  sourceTitle: string;
  quotedSpan: string;
  retrievedAt: string;
}

/** Strip HTML tags and decode common HTML entities from Brave Search API results */
function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const BRAVE_TIMEOUT_MS = 8_000;
const MAX_RESULTS_PER_QUERY = 5;
const MAX_EVIDENCE_RETURNED = 5;

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

/**
 * Generates optimized search queries from a factual claim.
 * A verbatim claim like "The GDP of France was $2.78 trillion in 2023"
 * makes a poor search query. This reformulates it into targeted queries.
 */
async function generateSearchQueries(claim: string): Promise<string[]> {
  try {
    const raw = await callLLM(
      `You generate concise web search queries to fact-check a claim. Return 2 different search queries that would help verify or refute the claim. Each query should target a different angle or source type (e.g., official statistics, news reports, academic sources).

Rules:
- Queries should be 3-8 words, like what a researcher would type into Google
- Include key entities, numbers, and dates from the claim
- Do NOT just repeat the claim verbatim
- Return ONLY valid JSON: {"queries": ["query 1", "query 2"]}`,
      `Fact-check this claim: "${claim}"`
    );

    const parsed = raw as { queries?: string[] };
    if (Array.isArray(parsed?.queries) && parsed.queries.length > 0) {
      return parsed.queries.slice(0, 2);
    }
  } catch {
    // Fall back to verbatim claim
  }

  return [claim];
}

async function searchBrave(
  query: string,
  apiKey: string,
  count: number
): Promise<BraveWebResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRAVE_TIMEOUT_MS);

  try {
    const url = `${BRAVE_SEARCH_URL}?q=${encodeURIComponent(query)}&count=${count}`;
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
    return payload.web?.results ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Deduplicates evidence by URL, keeping the first occurrence.
 */
function deduplicateByUrl(results: BraveWebResult[]): BraveWebResult[] {
  const seen = new Set<string>();
  return results.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export async function retrieveEvidence(
  claim: string
): Promise<RetrievedEvidence[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    // Generate optimized search queries
    const queries = await generateSearchQueries(claim);

    // Run all queries in parallel
    const allResultArrays = await Promise.all(
      queries.map((q) => searchBrave(q, apiKey, MAX_RESULTS_PER_QUERY))
    );

    const allResults = deduplicateByUrl(allResultArrays.flat());
    const retrievedAt = new Date().toISOString();

    return allResults
      .filter(
        (item): item is Required<Pick<BraveWebResult, "url">> & BraveWebResult =>
          Boolean(item?.url)
      )
      .slice(0, MAX_EVIDENCE_RETURNED)
      .map((item) => ({
        sourceUrl: item.url,
        sourceTitle: item.title ? stripHtml(item.title) : item.url,
        quotedSpan: item.description
          ? stripHtml(item.description)
          : "No snippet provided by search engine.",
        retrievedAt,
      }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown retrieval error";
    console.error(
      JSON.stringify({
        level: "warn",
        event: "brave_retrieval_failed",
        claim: claim.slice(0, 120),
        error: message,
      })
    );
    return [];
  }
}
