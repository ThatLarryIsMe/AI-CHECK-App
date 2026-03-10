const MAX_PDF_BYTES = 10_000_000; // 10 MB

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

/**
 * Extract text from a PDF buffer using pdf-parse.
 *
 * IMPORTANT: We import from "pdf-parse/lib/pdf-parse.js" directly rather than
 * the package root. The package root auto-runs a test that imports pdfjs-dist
 * canvas bindings, which crash in Node/Vercel with "DOMMatrix is not defined".
 * The lib path skips that test bootstrapping entirely.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_PDF_BYTES) {
    throw Object.assign(
      new Error(`PDF is too large (${Math.round(buffer.length / 1_000_000)} MB, max 10 MB)`),
      { type: "PDF_TOO_LARGE" }
    );
  }

  // Use the internal lib path to avoid the test-file side-effect that triggers
  // pdfjs-dist canvas/DOMMatrix usage.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
    buf: Buffer,
    options?: Record<string, unknown>
  ) => Promise<{ text: string; numpages: number }>;

  let result: { text: string };
  try {
    result = await pdfParse(buffer, {
      // Disable rendering pipeline — we only need text, not layout
      max: 0,
    });
  } catch (err: unknown) {
    throw Object.assign(
      new Error(`Failed to parse PDF: ${err instanceof Error ? err.message : "unknown"}`),
      { type: "PDF_PARSE_FAILED" }
    );
  }

  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  if (text.length < 50) {
    throw Object.assign(
      new Error("PDF contains too little text to verify (is it a scanned image?)"),
      { type: "PDF_NO_TEXT" }
    );
  }

  return text;
}
