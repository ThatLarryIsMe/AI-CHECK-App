import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

/**
 * POST /api/extract-url
 * Fetches a URL server-side with a real browser User-Agent to avoid 403 blocks,
 * then extracts visible text content from the HTML.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Basic URL validation
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json(
      { error: "Only HTTP/HTTPS URLs are supported" },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `URL returned status ${response.status}` },
        { status: 422 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      return NextResponse.json(
        {
          error: `Unsupported content type: ${contentType.split(";")[0]}. Please use a webpage URL.`,
        },
        { status: 422 }
      );
    }

    const html = await response.text();
    const text = extractTextFromHtml(html);

    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from this URL." },
        { status: 422 }
      );
    }

    // Limit to ~10k chars to keep within verify API limits
    const trimmed = text.slice(0, 10_000);

    return NextResponse.json({ text: trimmed });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch URL";
    if (message.includes("abort")) {
      return NextResponse.json(
        { error: "URL fetch timed out after 15 seconds." },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: message }, { status: 422 });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Strip HTML tags and extract visible text.
 * This is a simple server-side approach that avoids needing a DOM parser.
 */
function extractTextFromHtml(html: string): string {
  let text = html;

  // Remove script and style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, " ");

  // Replace block-level tags with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");
  text = text.trim();

  return text;
}
