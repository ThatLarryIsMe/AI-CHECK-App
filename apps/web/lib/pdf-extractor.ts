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
 * Extract text from a PDF buffer.
 * Uses pdf-parse v2 (PDFParse class with getText()).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_PDF_BYTES) {
    throw Object.assign(
      new Error(`PDF is too large (${Math.round(buffer.length / 1_000_000)} MB, max 10 MB)`),
      { type: "PDF_TOO_LARGE" }
    );
  }

  // pdf-parse v2 exports { PDFParse } class, not a function
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require("pdf-parse") as {
    PDFParse: new (opts: { data: Uint8Array }) => {
      getText(): Promise<{ text: string; total: number }>;
      destroy(): Promise<void>;
    };
  };

  let text: string;
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    text = result.text;
    await parser.destroy();
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
