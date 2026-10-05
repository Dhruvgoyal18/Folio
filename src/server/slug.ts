const RESERVED = new Set(["api", "u", "site", "create", "edit", "admin", "design-system", "about", "login", "signup", "www", "static", "_next", "fonts", "new", "help", "terms", "privacy"]);

/** "Dhruv Goyal" → "dhruv-goyal". ASCII-only, 3–40 chars. */
export function slugify(name: string): string {
  const s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return s.length >= 3 ? s : `${s || "folio"}-site`;
}

export function isValidSlug(s: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s) && !RESERVED.has(s) && !s.includes("--");
}

/** First free slug: base, base-2, base-3 … */
export async function uniqueSlug(base: string, taken: (s: string) => Promise<boolean>): Promise<string> {
  let s = isValidSlug(base) ? base : slugify(base);
  if (!isValidSlug(s)) s = `${s}-site`.slice(0, 40);
  if (!(await taken(s))) return s;
  for (let i = 2; i < 1000; i++) {
    const c = `${s.slice(0, 36)}-${i}`;
    if (!(await taken(c))) return c;
  }
  return `${s.slice(0, 30)}-${Date.now().toString(36)}`;
}
