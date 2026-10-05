/**
 * Published-site audit: publishes a corpus of résumés in every concept, then for each site,
 * viewport and theme screenshots every chapter and checks for console errors, horizontal
 * overflow, overlapping text, text running off-screen, and over/under-sized type.
 *   npm run build && SITES_STORE=memory CREATE_RATE_PER_MIN=1000 npm run serve
 *   npx tsx scripts/audit-sites.mjs [outDir] [--quick]
 */
import { chromium, devices } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { parseResumeText } from "../src/extract/heuristic";
import { normalize } from "../src/extract/normalize";
import { tidyDraft } from "../src/extract/draft";
import { generateGenome } from "../src/genome/generate";
import { CORPUS } from "../tests/fixtures/resumes";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.argv[2] ?? "docs/screenshots/sites";
const QUICK = process.argv.includes("--quick");
mkdirSync(OUT, { recursive: true });

// 1) publish
const sources = { maya: readFileSync("public/samples/maya-chen.txt", "utf8"), ...(QUICK ? {} : { por: CORPUS.dhruvPor, nurse: CORPUS.nurseNoBullets, long: CORPUS.longAndRepetitive, minimal: CORPUS.studentMinimal, intern: CORPUS.internshipsUnderProjects }) };
const sites = [{ slug: "dhruv-goyal", label: "showcase" }];
for (const [name, text] of Object.entries(sources)) {
  const draft = tidyDraft(parseResumeText(text).draft);
  const { resume } = normalize(draft);
  for (const [i, concept] of ["mission", "editorial", "terminal"].entries()) {
    const slug = `audit-${name}-${concept}`.slice(0, 40);
    const genome = generateGenome(resume, { seed: 100 + i * 7 + name.length, concept });
    const r = await fetch(`${BASE}/api/sites`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draft, genome, slug }) });
    if (r.status !== 201 && r.status !== 409) throw new Error(`publish ${slug}: ${r.status} ${await r.text()}`);
    sites.push({ slug, label: `${name}-${concept}` });
  }
}

// 2) visit
const pre = "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? (existsSync(pre) ? pre : undefined) });
const SIZES = QUICK ? { laptop: { viewport: { width: 1280, height: 720 } } } : { laptop: { viewport: { width: 1280, height: 720 } }, phone: { ...devices["Pixel 7"] } };
const report = [];

const inspect = () => {
  const out = { overflow: document.documentElement.scrollWidth - innerWidth, overlaps: [], offscreen: [], huge: [], tiny: [] };
  const vis = (el) => {
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity) > 0.05;
  };
  const items = [];
  const walker = document.createTreeWalker(document.querySelector("main") ?? document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim();
    const el = n.parentElement;
    if (!t || !el || el.closest("[aria-hidden=true],svg,canvas,.sr-only,[data-testid=capcom-panel]") || !vis(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) if (r.width > 2 && r.height > 2) items.push({ el, t: t.slice(0, 40), r });
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const isHead = !!el.closest("h1,h2,h3,.display,.hero-name,[data-display]");
    if (!isHead && fs > 26.5) out.huge.push(`${Math.round(fs)}px ${t.slice(0, 30)}`);
    if (fs < 11) out.tiny.push(`${Math.round(fs * 10) / 10}px ${t.slice(0, 30)}`);
  }
  // text clipped on purpose by an overflow-hidden ancestor (marquees, carousels) isn't "off-screen"
  const clippedByDesign = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const o = getComputedStyle(a).overflowX;
      if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") return true;
    }
    return false;
  };
  for (const it of items) if ((it.r.right > innerWidth + 2 || it.r.left < -2) && !clippedByDesign(it.el)) out.offscreen.push(`${it.t} (${Math.round(it.r.left)}→${Math.round(it.r.right)})`);
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 4 && h > Math.min(a.r.height, b.r.height) * 0.4) out.overlaps.push(`“${a.t}” × “${b.t}”`);
    }
  out.overlaps = [...new Set(out.overlaps)].slice(0, 10);
  out.offscreen = [...new Set(out.offscreen)].slice(0, 10);
  out.huge = [...new Set(out.huge)].slice(0, 6);
  out.tiny = [...new Set(out.tiny)].slice(0, 6);
  return out;
};

for (const site of sites)
  for (const [size, opts] of Object.entries(SIZES))
    for (const theme of QUICK ? ["light"] : ["light", "dark"]) {
      const ctx = await browser.newContext({ ...opts, colorScheme: theme, reducedMotion: "reduce" });
      await ctx.addInitScript(([slug, t]) => localStorage.setItem(`dg01.site.${slug}.theme`, t), [site.slug, theme]);
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${BASE}/u/${site.slug}?noboot`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const ids = await page.evaluate(() => ["main", ...[...document.querySelectorAll("main > section[id], main section[id]")].map((s) => s.id)]);
      for (const id of [...new Set(ids)]) {
        if (id !== "main") {
          await page.evaluate((id) => {
            const el = document.getElementById(id);
            const l = window.__lenis;
            if (l) l.scrollTo(el, { immediate: true, offset: -60 });
            else el?.scrollIntoView();
          }, id);
          await page.waitForTimeout(500);
        }
        const name = `${site.label}-${size}-${theme}-${id}`;
        await page.screenshot({ path: `${OUT}/${name}.jpg`, quality: 70 });
        const r = await page.evaluate(inspect);
        if (r.overflow > 1 || r.overlaps.length || r.offscreen.length || r.huge.length || r.tiny.length) report.push({ name, ...r });
      }
      if (errors.length) report.push({ name: `${site.label}-${size}-${theme}`, errors });
      await ctx.close();
    }
await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(`${sites.length} sites; ${report.length} findings → ${OUT}/report.json`);
