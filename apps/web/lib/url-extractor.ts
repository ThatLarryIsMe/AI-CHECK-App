const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2_000_000; // 2 MB cap on downloaded HTML

/**
 * Fetch a URL and extract the main article text from the HTML.
 * Returns plain text suitable for the verification engine.
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
    throw Object.assign(new Error("Only HTTP/HTTPS URLs are supported"), { type: "INVALID_URL" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ProofMode/1.0 (fact-checker)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"))) {
      throw Object.assign(new Error("URL fetch timed out after 10s"), { type: "URL_TIMEOUT" });
    }
    throw Object.assign(
      new Error(`Failed to fetch URL: ${err instanceof Error ? err.message : "unknown"}`),
      { type: "URL_FETCH_FAILED" }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(`URL returned status ${response.status}`),
      { type: "URL_FETCH_FAILED" }
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw Object.assign(
      new Error("URL does not point to an HTML page"),
      { type: "INVALID_CONTENT_TYPE" }
    );
  }

  const html = await response.text();
  if (html.length > MAX_HTML_BYTES) {
    throw Object.assign(
      new Error("Page is too large to process"),
      { type: "URL_TOO_LARGE" }
    );
  }

  return htmlToText(html);
}

/**
 * Simple server-side HTML-to-text extraction.
 * Prioritizes article/main content, strips boilerplate.
 */
function htmlToText(html: string): string {
  // Try to extract from <article> or <main> first
  let content = extractTag(html, "article") ?? extractTag(html, "main") ?? html;

  // Remove elements that are not article content
  content = removeTag(content, "script");
  content = removeTag(content, "style");
  content = removeTag(content, "nav");
  content = removeTag(content, "header");
  content = removeTag(content, "footer");
  content = removeTag(content, "aside");
  content = removeTag(content, "noscript");
  content = removeTag(content, "svg");
  content = removeTag(content, "figure");
  content = removeTag(content, "iframe");

  // Strip all remaining HTML tags
  content = content.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  content = content
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ");

  // Collapse whitespace
  content = content.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  if (content.length < 50) {
    throw Object.assign(
      new Error("Could not extract meaningful text from the page"),
      { type: "EXTRACTION_FAILED" }
    );
  }

  return content;
}

function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = html.match(regex);
  return match?.[1] ?? null;
}

function removeTag(html: string, tag: string): string {
  return html.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
}
