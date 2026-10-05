/**
 * UI audit: screenshots of every platform screen (landing, studio steps, published site, 404)
 * at laptop / desktop / phone sizes in light and dark, plus automated checks:
 * console errors, horizontal overflow, text that is too small or too large, clipped controls.
 *   npm run build && SITES_STORE=memory npm run serve   then   node scripts/audit-ui.mjs [outDir]
 */
import { chromium, devices } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.argv[2] ?? "docs/screenshots/audit";
mkdirSync(OUT, { recursive: true });
const pre = "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? (existsSync(pre) ? pre : undefined) });
const SIZES = {
  laptop: { viewport: { width: 1280, height: 720 } },
  desktop: { viewport: { width: 1536, height: 864 } },
  phone: { ...devices["Pixel 7"] },
};
const report = [];

async function checks(page, name) {
  const r = await page.evaluate(() => {
    const out = { overflow: document.documentElement.scrollWidth - innerWidth, tiny: [], huge: [], clipped: [] };
    const seen = new Set();
    for (const el of document.querySelectorAll("body *")) {
      if (!(el instanceof HTMLElement) || !el.offsetParent || el.closest("[aria-hidden=true],svg,canvas,.sr-only")) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      const label = `${el.tagName.toLowerCase()}:${el.textContent.trim().slice(0, 30)}`;
      if (fs < 11.5 && !seen.has(label)) out.tiny.push(`${fs}px ${label}`), seen.add(label);
      if (["INPUT", "TEXTAREA", "BUTTON", "LABEL", "P", "LI", "SPAN", "A"].includes(el.tagName) && fs > 22 && !el.closest("h1,h2,.display,[data-display]") && !seen.has(label)) out.huge.push(`${fs}px ${label}`), seen.add(label);
      if ((el.tagName === "BUTTON" || el.tagName === "A") && el.scrollWidth > el.clientWidth + 2 && cs.overflow !== "visible") out.clipped.push(label);
    }
    return out;
  });
  report.push({ name, ...r, tiny: r.tiny.slice(0, 8), huge: r.huge.slice(0, 8) });
}

async function shoot(size, theme, path, file, act) {
  const ctx = await browser.newContext({ ...SIZES[size], colorScheme: theme, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  if (act) await act(page);
  await page.waitForTimeout(600);
  const name = `${size}-${theme}-${file}`;
  await page.screenshot({ path: `${OUT}/${name}.jpg`, quality: 80 });
  await checks(page, name);
  if (errors.length) report.push({ name, errors });
  await ctx.close();
}

const toReview = async (p) => {
  await p.getByTestId("use-sample").click();
  await p.locator('[data-testid^="ready-ok"]:visible').first().waitFor({ timeout: 20000 });
};
const toDesign = async (p) => {
  await toReview(p);
  const wide = (p.viewportSize()?.width ?? 0) >= 1024;
  await p.getByTestId(wide ? "to-design" : "to-design-mobile").click();
  await p.frameLocator('[data-testid="preview-frame"]').locator("h1").waitFor({ state: "attached", timeout: 20000 });
  await p.waitForTimeout(1500);
};
const toPublish = async (p) => {
  await toDesign(p);
  await p.getByTestId("to-publish").click();
  await p.getByTestId("slug").waitFor();
};

for (const size of Object.keys(SIZES))
  for (const theme of ["light", "dark"]) {
    await shoot(size, theme, "/", "landing");
    await shoot(size, theme, "/create", "create-upload");
    await shoot(size, theme, "/create", "create-review", toReview);
    await shoot(size, theme, "/create", "create-review-open", async (p) => { await toReview(p); await p.getByTestId("exp-entry").first().locator("summary").click(); await p.getByTestId("exp-entry").first().scrollIntoViewIfNeeded(); });
    await shoot(size, theme, "/create", "create-review-scrolled", async (p) => { await toReview(p); await p.mouse.wheel(0, 1400); });
    await shoot(size, theme, "/create", "create-design", toDesign);
    await shoot(size, theme, "/create", "create-design-mobile-preview", async (p) => {
      await toDesign(p);
      if ((p.viewportSize()?.width ?? 0) < 1024) await p.getByRole("tab", { name: "preview" }).click();
      else await p.getByRole("button", { name: "mobile" }).click();
      await p.waitForTimeout(1200);
    });
    await shoot(size, theme, "/create", "create-publish", toPublish);
    await shoot(size, theme, "/nowhere", "404");
  }
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report.filter((r) => r.errors || r.overflow > 1 || r.tiny?.length || r.huge?.length || r.clipped?.length).map((r) => ({ n: r.name, e: r.errors, o: r.overflow, t: r.tiny?.length, h: r.huge?.slice(0, 3), c: r.clipped?.slice(0, 3) })), null, 1));
