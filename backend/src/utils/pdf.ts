import type { TextItem } from "pdfjs-dist/types/src/display/api";

export interface PdfParseOptions {
  maxPages?: number;
  maxAiChars?: number;
  maxBytes?: number;
}

export interface PdfParseReport {
  sourceFileName: string;
  totalPages: number;
  pagesParsed: number;
  isPageLimitHit: boolean;
  isTextLimitHit: boolean;
  aiText: string;
}

const DEFAULT_MAX_PAGES = 24;
const DEFAULT_MAX_AI_CHARS = 20_000;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;

function truncateForAi(
  text: string,
  maxChars: number,
): { text: string; isTextLimitHit: boolean } {
  if (text.length <= maxChars) {
    return { text, isTextLimitHit: false };
  }

  const truncated = text.slice(0, maxChars);
  return {
    text: `${truncated}\n\n[PDF text truncated due to token limits.]`,
    isTextLimitHit: true,
  };
}

function getPageText(items: TextItem[]): string {
  return items
    .map((item) => (typeof item.str === "string" ? item.str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function parsePdfFromUrl(
  url: string,
  fileName: string,
  options: PdfParseOptions = {},
): Promise<PdfParseReport> {
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const maxAiChars = options.maxAiChars ?? DEFAULT_MAX_AI_CHARS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }

  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(
      `PDF is too large (${contentLength} bytes). Maximum supported size is ${maxBytes} bytes.`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const byteLength = arrayBuffer.byteLength;
  if (byteLength > maxBytes) {
    throw new Error(
      `PDF is too large (${byteLength} bytes). Maximum supported size is ${maxBytes} bytes.`,
    );
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableWorker: true,
    isEvalSupported: false,
  } as any);

  const document = await loadingTask.promise;
  const totalPages = document.numPages;
  const pagesToParse = Math.min(totalPages, maxPages);
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pagesToParse; pageNum += 1) {
    const page = await document.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items.filter(
      (item: any) => "str" in item,
    ) as TextItem[];
    const text = getPageText(items);
    if (text) {
      pageTexts.push(`[Page ${pageNum}]\n${text}`);
    }
  }

  const baseText = [
    `[Attached PDF: ${fileName}]`,
    `Pages Parsed: ${pagesToParse}/${totalPages}`,
    pageTexts.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const truncated = truncateForAi(baseText, maxAiChars);

  return {
    sourceFileName: fileName,
    totalPages,
    pagesParsed: pagesToParse,
    isPageLimitHit: totalPages > pagesToParse,
    isTextLimitHit: truncated.isTextLimitHit,
    aiText: truncated.text,
  };
}
