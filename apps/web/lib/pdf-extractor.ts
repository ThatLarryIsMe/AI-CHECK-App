// Polyfill DOMMatrix for Node.js — pdfjs-dist expects it but it only exists in browsers
if (typeof globalThis.DOMMatrix === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).DOMMatrix = class DOMMatrix {
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    is2D = true; isIdentity = true;
  };
}

const MAX_PDF_BYTES = 10_000_000; // 10 MB

/**
 * Extract text from a PDF buffer using pdf-parse.
 * The webpack config stubs `canvas` to false to prevent DOMMatrix errors.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_PDF_BYTES) {
    throw Object.assign(
      new Error(`PDF is too large (${Math.round(buffer.length / 1_000_000)} MB, max 10 MB)`),
      { type: "PDF_TOO_LARGE" }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (
    buf: Buffer,
    options?: Record<string, unknown>
  ) => Promise<{ text: string; numpages: number }>;

  let result: { text: string };
  try {
    result = await pdfParse(buffer, { max: 0 });
  } catch (err: unknown) {
    throw Object.assign(
      new Error(`Failed to parse PDF: ${err instanceof Error ? err.message : "unknown"}`),
      { type: "PDF_PARSE_FAILED" }
    );
  }

  const text = result.text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  if (text.length < 50) {
    throw Object.assign(
      new Error("PDF contains too little text to verify (is it a scanned image?)"),
      { type: "PDF_NO_TEXT" }
    );
  }

  return text;
}
