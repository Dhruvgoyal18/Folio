import type { SiteData } from "@/site/model";
import { genomeAttrs, genomeCss } from "@/genome/apply";
import { PAIRINGS } from "@/genome/fonts";
import { dateRange } from "@/lib/resume";

/**
 * Turns the static /site shell into a specific person's page, at the edge:
 * - window.__SITE__META__ before the theme boot script (no theme flash)
 * - the genome's CSS + font preloads in <head> (no colour/font flash)
 * - title/description/OG tags for sharing and search
 * - the site JSON (escaped) for the client renderer, and a <noscript> text version
 * Pure string work so the same code runs in Cloudflare Functions and Node.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** JSON safe to embed inside <script>: no "</script>", no HTML comment openers, no line separators. */
export const jsonForScript = (v: unknown) =>
  JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

function noscript(site: SiteData): string {
  const r = site.resume;
  const p = r.profile;
  const roles = r.experience
    .map((e) => `<li><strong>${esc(e.role)}</strong>, ${esc(e.org)} (${esc(dateRange(e.start, e.end, e.yearOnly))})<ul>${e.groups.flatMap((g) => g.highlights).map((h) => `<li>${esc(h.text)}</li>`).join("")}</ul></li>`)
    .join("");
  const edu = r.education.map((e) => `<li>${esc(e.degree)}, ${esc(e.institution)}</li>`).join("");
  return `<noscript><main style="max-width:72ch;margin:4rem auto;padding:0 1rem;font-family:system-ui"><h1>${esc(p.name)}</h1><p>${esc(p.headline)}</p>${roles ? `<h2>Experience</h2><ul>${roles}</ul>` : ""}${edu ? `<h2>Education</h2><ul>${edu}</ul>` : ""}${p.email ? `<p>Contact: <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></p>` : ""}</main></noscript>`;
}

export function injectSite(shell: string, site: SiteData, opts: { canonical?: string } = {}): string {
  const p = site.resume.profile;
  const g = site.genome;
  const title = `${p.name} — ${p.currentRole || p.headline}`;
  const desc = p.headline;
  const pairing = PAIRINGS[g.fonts];
  const fonts = [...new Set([pairing.display, pairing.text])].map((f) => `<link rel="preload" href="/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin="">`).join("");
  const meta = `<script>window.__SITE_META__=${jsonForScript({ slug: site.slug, theme: g.defaultTheme })}</script>`;
  const head = [
    `<style id="genome-ssr">${genomeCss(g)}</style>`,
    fonts,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:type" content="profile">`,
    opts.canonical ? `<link rel="canonical" href="${esc(opts.canonical)}">` : "",
  ].join("");
  const attrs = Object.entries({ ...genomeAttrs(g), "data-theme": g.defaultTheme })
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(" ");
  let html = shell;
  // <html ...> attributes (drop any existing data-theme so ours wins)
  html = html.replace(/<html([^>]*)>/i, (_, a: string) => `<html${a.replace(/\sdata-theme="[^"]*"/, "")} ${attrs}>`);
    // NB: function replacers — user text may contain "$&"/"$1", which string replacements would expand.
  html = html.replace(/<head([^>]*)>/i, (m) => `${m}${meta}`);
  html = html.replace(/<title>[^<]*<\/title>/i, () => `<title>${esc(title)}</title>`);
  html = html.replace(/<meta name="description"[^>]*>/i, () => "");
  // the shell is noindex and preloads the platform's fonts; a published site is indexable and preloads its own
  html = html.replace(/<meta name="robots"[^>]*>/gi, () => "");
  html = html.replace(/<link rel="preload" href="\/fonts\/[^"]+" as="font"[^>]*>/gi, () => "");
  html = html.replace(/<\/head>/i, () => `${head}</head>`);
  html = html.replace(/<\/body>/i, () => `<script id="site-data" type="application/json">${jsonForScript(site)}</script>${noscript(site)}</body>`);
  return html;
}
