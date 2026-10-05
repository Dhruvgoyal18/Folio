/**
 * Rebuilds reading-order lines from PDF.js text items: groups items by baseline (y),
 * sorts by x, and marks wide gaps with a tab so "Company      May 2024 – Jun 2024" splits cleanly.
 * Pure function — used by the browser uploader and by the Node tests.
 */
export type PdfItem = { str: string; transform: number[]; width: number; height?: number; hasEOL?: boolean };

export function itemsToLines(pages: PdfItem[][]): string[] {
  const out: string[] = [];
  for (const items of pages) {
    const rows: Array<{ y: number; items: PdfItem[] }> = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5]!;
      const row = rows.find((r) => Math.abs(r.y - y) < 2.5);
      if (row) row.items.push(it);
      else rows.push({ y, items: [it] });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.transform[4]! - b.transform[4]!);
      let line = "";
      let lastEnd: number | null = null;
      for (const it of r.items) {
        const x = it.transform[4]!;
        const size = Math.abs(it.transform[0]!) || it.height || 10;
        if (lastEnd !== null) {
          const gap = x - lastEnd;
          if (gap > size * 2.5) line += "\t";
          else if (gap > size * 0.15 && !line.endsWith(" ")) line += " ";
        }
        line += it.str;
        lastEnd = x + it.width;
      }
      out.push(line.replace(/[ ]{2,}/g, " ").trim());
    }
    out.push("");
  }
  return out;
}
