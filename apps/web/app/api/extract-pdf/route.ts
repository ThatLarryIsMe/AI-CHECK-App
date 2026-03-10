import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { extractTextFromPdf } from "@/lib/pdf-extractor";

export const maxDuration = 30;

// Max 5MB PDF upload
const MAX_PDF_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/extract-pdf
 * Accepts a PDF file upload and extracts text content.
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "No PDF file uploaded" },
      { status: 400 }
    );
  }

  if (file.size > MAX_PDF_SIZE) {
    return NextResponse.json(
      { error: "PDF file too large (max 5MB)" },
      { status: 400 }
    );
  }

  if (file.type && !file.type.includes("pdf")) {
    return NextResponse.json(
      { error: "Only PDF files are supported" },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await extractTextFromPdf(buffer);

    // Limit to ~10k chars
    const trimmed = text.slice(0, 10_000);

    return NextResponse.json({ text: trimmed });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to parse PDF";
    console.error(
      JSON.stringify({
        level: "error",
        event: "pdf_extract_failed",
        error: message,
      })
    );
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
