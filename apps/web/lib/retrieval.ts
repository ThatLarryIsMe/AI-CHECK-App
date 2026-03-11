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
const MAX_RESULTS_PER_QUERY = 8;
const MAX_EVIDENCE_RETURNED = 10;

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
 * Generates research-grade search queries from a factual claim.
 *
 * Unlike a simple keyword search, this generates queries that a doctoral
 * researcher would use: targeting primary sources, peer-reviewed literature,
 * government databases, and authoritative institutional records.
 */
async function generateSearchQueries(claim: string): Promise<string[]> {
  try {
    const raw = await callLLM(
      `You are a doctoral-level research methodologist generating search queries to rigorously verify a factual claim. Your queries must target the highest-quality evidence available.

Generate 4 search queries, each targeting a DIFFERENT evidence tier:

1. **Primary/Official source**: Target government databases, official reports, peer-reviewed journals, court records, legislative texts, or the original institution that would hold authoritative data (e.g., "WHO global tuberculosis report 2023", "SEC 10-K filing Tesla 2024").

2. **Scholarly/Expert analysis**: Target academic analysis, expert commentary, or reputable research institutions (e.g., "Brookings Institution analysis GDP growth", "Nature study climate change 2024").

3. **Quality journalism/Investigative**: Target established news organizations known for fact-checking and investigative reporting (e.g., "Reuters fact check claim", "AP News investigation").

4. **Counter-evidence/Alternative perspective**: Actively seek sources that might CONTRADICT the claim — this prevents confirmation bias (e.g., "criticism of [claim subject]", "debunked [claim topic]").

Rules:
- Each query should be 4-12 words — specific enough to find relevant results
- Include specific entities, dates, numbers, and proper nouns from the claim
- NEVER repeat the claim verbatim as a query
- Prefer queries that would surface primary data over secondary commentary
- Return ONLY valid JSON: {"queries": ["query 1", "query 2", "query 3", "query 4"]}`,
      `Fact-check this claim: "${claim}"`
    );

    const parsed = raw as { queries?: string[] };
    if (Array.isArray(parsed?.queries) && parsed.queries.length > 0) {
      return parsed.queries.slice(0, 4);
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
    // Generate research-grade search queries across multiple evidence tiers
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
