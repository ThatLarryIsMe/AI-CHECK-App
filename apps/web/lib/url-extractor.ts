// NOTE: jsdom + @mozilla/readability must be in apps/web/package.json (added in this PR)
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 4_000_000; // 4 MB cap on downloaded HTML

/**
 * Realistic browser-like headers so most sites don't block the server fetch.
 */
function buildHeaders(): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Jina.ai reader proxy fallback — used when the primary fetch gets a 403/401.
 * Returns extracted markdown/text or null if the proxy also fails.
 */
async function tryJinaFallback(originalUrl: string): Promise<string | null> {
  // jina accepts: https://r.jina.ai/<original-url>
  const jinaUrl = `https://r.jina.ai/${originalUrl}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(jinaUrl, { headers: buildHeaders() });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const text = await res.text().catch(() => null);
  if (!text || text.trim().length < 50) return null;
  return text.trim();
}

/**
 * Extract readable article text from raw HTML using @mozilla/readability + jsdom.
 * Falls back to naive tag-stripping if Readability finds nothing.
 */
function extractReadableText(html: string, url: string): string {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article?.textContent && article.textContent.trim().length >= 50) {
      return article.textContent
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
    // Readability gave up — fall back to body text
    const bodyText = dom.window.document.body.textContent ?? "";
    return bodyText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    // Absolute last resort: naive regex strip
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}

/**
 * Fetch a URL and extract the main article text from the HTML.
 * Returns plain text suitable for the verification engine.
 *
 * Strategy:
 *   1. Fetch with realistic browser headers + redirect follow + 10s timeout.
 *   2. Guard on content-length header before downloading.
 *   3. If 403/401 → try jina.ai proxy fallback.
 *   4. Parse with @mozilla/readability for clean article extraction.
 */
export async function extractTextFromUrl(url: string): Promise<string> {
  // Validate URL format
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw Object.assign(new Error("Invalid URL format"), { type: "INVALID_URL" });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw Object.assign(
      new Error("Only HTTP/HTTPS URLs are supported"),
      { type: "INVALID_URL" }
    );
  }

  // --- Primary fetch ---
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Factward/1.0 (fact-checker)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"))) {
      throw Object.assign(
        new Error("URL fetch timed out after 10s"),
        { type: "URL_TIMEOUT" }
      );
    }
    throw Object.assign(
      new Error(`Failed to fetch URL: ${err instanceof Error ? err.message : "unknown"}`),
      { type: "URL_FETCH_FAILED" }
    );
  } finally {
    clearTimeout(timeout);
  }

  // --- 403 / 401: try jina.ai proxy ---
  if (response.status === 403 || response.status === 401) {
    const jinaText = await tryJinaFallback(url);
    if (jinaText) {
      return jinaText.length > 20_000 ? jinaText.slice(0, 20_000) : jinaText;
    }
    throw Object.assign(
      new Error(
        "This site blocks automated access (HTTP " +
          response.status +
          "). Paste the article text or upload a PDF instead."
      ),
      { type: "URL_BLOCKED" }
    );
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(`URL returned status ${response.status}`),
      { type: "URL_FETCH_FAILED" }
    );
  }

  // --- Content-type guard ---
  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml")
  ) {
    throw Object.assign(
      new Error("URL does not point to an HTML page"),
      { type: "INVALID_CONTENT_TYPE" }
    );
  }

  // --- Content-length guard (before downloading body) ---
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_HTML_BYTES) {
    throw Object.assign(
      new Error("Page is too large to process (content-length exceeds 4 MB)"),
      { type: "URL_TOO_LARGE" }
    );
  }

  // --- Download body ---
  const html = await response.text();
  if (html.length > MAX_HTML_BYTES) {
    throw Object.assign(
      new Error("Downloaded page is too large to process (exceeds 4 MB)"),
      { type: "URL_TOO_LARGE" }
    );
  }

  // --- Extract readable text ---
  const text = extractReadableText(html, url);

  if (text.length < 50) {
    throw Object.assign(
      new Error("Could not extract meaningful text from the page"),
      { type: "EXTRACTION_FAILED" }
    );
  }

  return text;
}
