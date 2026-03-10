declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export function getDocument(params: {
    data: Uint8Array;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
  }): { promise: Promise<import("pdfjs-dist").PDFDocumentProxy> };
}
