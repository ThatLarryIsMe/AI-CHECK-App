import { NextRequest, NextResponse } from "next/server";
import { extractTextFromUrl } from "@/lib/url-extractor";

export const maxDuration = 30;

/**
 * POST /api/extract-url
 * Fetches a URL server-side and extracts visible text content.
 * Uses the shared url-extractor which includes Jina fallback for 401/403.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const text = await extractTextFromUrl(url);

    // Limit to ~10k chars to keep within verify API limits
    const trimmed = text.slice(0, 10_000);

    return NextResponse.json({ text: trimmed });
  } catch (err: unknown) {
    const error = err as { message?: string; type?: string };
    const message = error.message ?? "Failed to fetch URL";
    const status = error.type === "INVALID_URL" ? 400 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
