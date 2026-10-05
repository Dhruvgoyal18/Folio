import { itemsToLines, type PdfItem } from "./pdf-lines";

/** Minimal slice of a PDF.js document we depend on (works with both the browser and Node builds). */
export type PdfDoc = {
  numPages: number;
  getPage(n: number): Promise<{
    getTextContent(): Promise<{ items: unknown[] }>;
    getAnnotations(): Promise<Array<{ subtype?: string; url?: string; unsafeUrl?: string }>>;
  }>;
};

export type PdfText = { text: string; links: string[] };

/** Reading-order text plus every URI link annotation (LinkedIn/GitHub are often only links). */
export async function pdfDocToText(doc: PdfDoc): Promise<PdfText> {
  const pages: PdfItem[][] = [];
  const links = new Set<string>();
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    pages.push((await page.getTextContent()).items.filter((it): it is PdfItem => typeof (it as PdfItem).str === "string"));
    for (const a of await page.getAnnotations().catch(() => [])) {
      const url = a.url ?? a.unsafeUrl;
      if (a.subtype === "Link" && url && /^(https?:|mailto:|tel:)/i.test(url)) links.add(url);
    }
  }
  return { text: itemsToLines(pages).join("\n"), links: [...links] };
}
