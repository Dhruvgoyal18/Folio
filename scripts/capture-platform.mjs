/**
 * Platform captures: landing, the studio (upload → review → design), and one résumé rendered
 * as several different sites. Output → docs/screenshots/platform.
 *   npm run build && npm run serve   (separate terminal; publish samples with scripts/publish-sample.ts)
 *   node scripts/capture-platform.mjs
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = "docs/screenshots/platform";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? ((await import("node:fs")).existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined) });

async function shot(ctxOpts, path, file, prep) {
  const ctx = await browser.newContext({ ...ctxOpts, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}noboot`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  if (prep) await prep(page);
  await page.screenshot({ path: `${OUT}/${file}.jpg`, quality: 82 });
  await ctx.close();
}
const desktop = { viewport: { width: 1440, height: 900 } };
const mobile = { ...devices["Pixel 7"] };

await shot(desktop, "/", "01-landing-desktop");
await shot(desktop, "/", "02-landing-variety", async (p) => { await p.evaluate(() => { window.__lenis?.scrollTo(document.getElementById("variety"), { immediate: true }) ?? document.getElementById("variety")?.scrollIntoView(); }); await p.waitForTimeout(600); });
await shot(mobile, "/", "03-landing-mobile");

// same résumé (the showcase PDF), five genomes
const variants = [
  ["mission", 11], ["mission", 7], ["editorial", 23], ["editorial", 51], ["terminal", 37], ["terminal", 90],
];
for (const [c, s] of variants) {
  await shot(desktop, `/site?demo=${c}&seed=${s}`, `10-same-resume-${c}-${s}-desktop`);
  await shot(mobile, `/site?demo=${c}&seed=${s}`, `11-same-resume-${c}-${s}-mobile`);
}
await shot(desktop, "/u/dhruv-goyal", "12-showcase-signature-desktop");
await shot(desktop, "/u/maya-chen", "13-published-maya-editorial-desktop");
await shot(desktop, "/u/maya-terminal", "14-published-maya-terminal-desktop");
await shot(desktop, "/u/maya-chen", "15-published-maya-trajectory", (p) => p.evaluate(() => document.getElementById("trajectory")?.scrollIntoView()));

// studio
const ctx = await browser.newContext({ ...desktop, reducedMotion: "reduce" });
const page = await ctx.newPage();
await page.goto(`${BASE}/create`);
await page.screenshot({ path: `${OUT}/20-studio-upload.jpg`, quality: 82 });
await page.getByTestId("resume-file").setInputFiles("tests/fixtures/dhruv.pdf");
await page.getByTestId("ready-ok").waitFor();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/21-studio-review.jpg`, quality: 82 });
await page.getByTestId("to-design").click();
await page.frameLocator('[data-testid="preview-frame"]').locator("h1").waitFor();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/22-studio-design.jpg`, quality: 82 });
await page.getByTestId("concept-editorial").click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/23-studio-design-editorial.jpg`, quality: 82 });
await page.getByTestId("to-publish").click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/24-studio-publish.jpg`, quality: 82 });
await ctx.close();
await browser.close();
console.log("captured →", OUT);
