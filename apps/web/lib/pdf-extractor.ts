const MAX_PDF_BYTES = 10_000_000; // 10 MB

/**
 * Extract text from a PDF buffer using pdf-parse v1.1.1.
 *
 * We import from "pdf-parse/lib/pdf-parse" to bypass the debug/test
 * code in the package's index.js that tries to read a local test file.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_PDF_BYTES) {
    throw Object.assign(
      new Error(`PDF is too large (${Math.round(buffer.length / 1_000_000)} MB, max 10 MB)`),
      { type: "PDF_TOO_LARGE" }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse") as (
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
