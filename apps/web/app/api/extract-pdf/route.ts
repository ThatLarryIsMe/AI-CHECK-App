import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export const maxDuration = 30;

// Max 5MB PDF upload
const MAX_PDF_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/extract-pdf
 * Accepts a PDF file upload and extracts text content.
 * Uses pdf-parse (v3+) with a DOMMatrix polyfill for Node.js.
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
    const data = new Uint8Array(arrayBuffer);

    // Polyfill DOMMatrix for Node.js — pdfjs-dist requires it
    if (typeof globalThis.DOMMatrix === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        m11 = 1; m12 = 0; m13 = 0; m14 = 0;
        m21 = 0; m22 = 1; m23 = 0; m24 = 0;
        m31 = 0; m32 = 0; m33 = 1; m34 = 0;
        m41 = 0; m42 = 0; m43 = 0; m44 = 1;
        is2D = true;
        isIdentity = true;
        inverse() { return new DOMMatrix(); }
        multiply() { return new DOMMatrix(); }
        translate() { return new DOMMatrix(); }
        scale() { return new DOMMatrix(); }
        rotate() { return new DOMMatrix(); }
        transformPoint() { return { x: 0, y: 0, z: 0, w: 1 }; }
        toFloat32Array() { return new Float32Array(16); }
        toFloat64Array() { return new Float64Array(16); }
      };
    }

    // Dynamic import to avoid bundling issues
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data });
    const result = await parser.getText();
    await parser.destroy();

    const text = result.text?.trim();

    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from this PDF." },
        { status: 422 }
      );
    }

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
