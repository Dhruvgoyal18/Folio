const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};
const pad = (n: number) => String(n).padStart(2, "0");

/** "Sept 2025" | "09/2025" | "2025-09" | "2025" → "2025-09" / "2025-01"; "Present" → null; unknown → undefined. */
export function parseDate(input: string | undefined | null): string | null | undefined {
  if (!input) return undefined;
  const s = input.trim().toLowerCase().replace(/[.,]/g, " ");
  if (/^(present|current|currently|now|ongoing|today|till date|to date|date|nu|heute|aktuell|présent|actuel|presente|actualidad|actual|atual|oggi|hoy)$/.test(s.trim())) return null;
  let m = s.match(/^(\d{4})\s*[-./\s]\s*(\d{1,2})\b/);
  if (m) return `${m[1]}-${pad(Math.min(12, Math.max(1, +m[2]!)))}`;
  m = s.match(/\b([a-z]{3,9})\s*'?(\d{2,4})\b/);
  if (m && MONTHS[m[1]!]) {
    const y = m[2]!.length === 2 ? 2000 + +m[2]! : +m[2]!;
    return `${y}-${pad(MONTHS[m[1]!]!)}`;
  }
  m = s.match(/\b(\d{1,2})\s*[/.-]\s*(\d{4})\b/);
  if (m && +m[1]! >= 1 && +m[1]! <= 12) return `${m[2]}-${pad(+m[1]!)}`;
  m = s.match(/\b(19[5-9]\d|20\d{2})\b/);
  if (m) return `${m[1]}-01`;
  return undefined;
}

const MONTH_RE = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const ONE = `(?:${MONTH_RE}\\.?\\s*'?\\d{2,4}|\\d{1,2}\\s*[/.]\\s*\\d{4}|(?:19|20)\\d{2}\\s*[./]\\s*\\d{1,2}(?!\\d)|(?:19|20)\\d{2})`;
const END = `(?:${ONE}|present|current(?:ly)?|now|ongoing|till date|to date|date|nu|heute|aktuell|présent|actuel|presente|actualidad|actual|atual|oggi|hoy)`;
/** Matches "May 2024 – Jun 2024", "2019 - Present", "05/2021 to 08/2022" (case-insensitive). */
export const DATE_RANGE = new RegExp(`(${ONE})\\s*(?:–|—|-|to|until)\\s*(${END})`, "i");
export const SINGLE_DATE = new RegExp(`\\b(${ONE})\\b`, "i");

export function findRange(line: string): { start: string; end: string; index: number; length: number } | null {
  const m = line.match(DATE_RANGE);
  if (!m || m.index === undefined) return null;
  return { start: m[1]!, end: m[2]!, index: m.index, length: m[0].length };
}

/** Does this date string name a month (so it isn't just a year)? */
export function hasMonth(input: string | undefined | null): boolean {
  if (!input) return false;
  const s = input.toLowerCase();
  return new RegExp(`\\b${MONTH_RE}\\b`).test(s) || /\b\d{1,2}\s*[/.]\s*\d{4}\b|\b\d{4}\s*[-./]\s*\d{1,2}\b/.test(s);
}
