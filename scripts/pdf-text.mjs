// Usage: node scripts/pdf-text.mjs file.pdf  → prints reconstructed lines (same algorithm as the browser uploader)
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
const { itemsToLines } = await import("../src/extract/pdf-lines.ts").catch(async () => (await import("tsx/esm/api")).tsImport("../src/extract/pdf-lines.ts", import.meta.url));
const data = new Uint8Array(readFileSync(process.argv[2]));
const doc = await getDocument({ data, useSystemFonts: true }).promise;
const pages = [];
for (let i = 1; i <= doc.numPages; i++) pages.push((await (await doc.getPage(i)).getTextContent()).items);
console.log(itemsToLines(pages).join("\n"));
