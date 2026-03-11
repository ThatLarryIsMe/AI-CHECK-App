declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  interface TextItem {
    str: string;
    dir: string;
    transform: number[];
    width: number;
    height: number;
  }

  interface TextContent {
    items: (TextItem | Record<string, unknown>)[];
  }

  interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
  }

  interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
    destroy(): Promise<void>;
  }

  interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export function getDocument(params: {
    data: Uint8Array;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
  }): PDFDocumentLoadingTask;
}
