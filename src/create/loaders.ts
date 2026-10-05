"use client";

import type { PdfDoc } from "@/extract/pdf";

/**
 * Turns an uploaded file into plain text in the browser — the file itself never leaves the
 * visitor's machine; only the extracted text is sent for structuring.
 */
export type Loaded = { text: string; links: string[]; kind: "pdf" | "docx" | "text" };

export const ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function loadFile(file: File): Promise<Loaded> {
  if (file.size > MAX_FILE_BYTES) throw new Error("That file is larger than 8 MB.");
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
    const doc = (await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise) as unknown as PdfDoc;
    const { pdfDocToText } = await import("@/extract/pdf");
    const out = await pdfDocToText(doc);
    if (out.text.replace(/\s/g, "").length < 40) throw new Error("This PDF has no selectable text (it may be a scan). Try a DOCX, or paste the text instead.");
    return { ...out, kind: "pdf" };
  }
  if (name.endsWith(".docx")) {
    // @ts-expect-error — the browser build ships without types
    const mammoth = (await import("mammoth/mammoth.browser.js")) as { extractRawText(o: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>; convertToHtml(o: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }> };
    const [{ value: text }, { value: html }] = await Promise.all([mammoth.extractRawText({ arrayBuffer: buf }), mammoth.convertToHtml({ arrayBuffer: buf })]);
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, "&"));
    // mammoth separates paragraphs with blank lines; collapse them so entries stay together
    return { text: text.replace(/\n{2,}/g, "\n"), links, kind: "docx" };
  }
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return { text: new TextDecoder().decode(buf).replace(/^#+\s*/gm, "").replace(/\*\*/g, ""), links: [], kind: "text" };
  }
  throw new Error("Please upload a PDF, DOCX or text file.");
}
