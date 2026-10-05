/**
 * Visual QA capture: every scene on desktop + mobile, light + dark, plus a
 * screen-recorded walkthrough per viewport. Output → docs/screenshots, docs/video.
 *   npm run build && npm run serve   (separate terminal)
 *   node scripts/capture.mjs
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync, renameSync, readdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const exe = process.env.PW_CHROMIUM ?? ((await import("node:fs")).existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const args = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
mkdirSync("docs/screenshots", { recursive: true });
mkdirSync("docs/video", { recursive: true });

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { ...devices["Pixel 7"] },
};
const SCENES = ["telemetry", "trajectory", "payload", "missions", "training", "comms"];

const forceGPU = () => {
  // headless CI machines report few cores; present as a capable device so the WebGL path is captured
  Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
};

async function scrollTo(page, id) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    const l = window.__lenis;
    if (l) l.scrollTo(el, { immediate: true, offset: -64 });
    else el.scrollIntoView();
  }, id);
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch({ executablePath: exe, args });
for (const [vp, opts] of Object.entries(VIEWPORTS)) {
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.addInitScript(forceGPU);
    await page.addInitScript((t) => localStorage.setItem("dg01.prefs", JSON.stringify({ theme: t })), theme);
    await page.goto(`${BASE}/u/dhruv-goyal?noboot`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `docs/screenshots/${vp}-${theme}-01-launch.png` });
    // mid-collapse and end of the wow moment
    const h = opts.viewport.height;
    await page.mouse.wheel(0, h * 0.7);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `docs/screenshots/${vp}-${theme}-01b-collapse.png` });
    await page.mouse.wheel(0, h * 0.55);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `docs/screenshots/${vp}-${theme}-01c-one-line.png` });
    // pass through every section so reveals fire, then capture each
    for (const [i, id] of SCENES.entries()) {
      await scrollTo(page, id);
      await page.screenshot({ path: `docs/screenshots/${vp}-${theme}-0${i + 2}-${id}.png` });
    }
    // dossier
    await scrollTo(page, "missions");
    await page.locator("#proj-nl2sql").click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `docs/screenshots/${vp}-${theme}-09-dossier.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    // chat
    await page.getByTestId("capcom-orb").click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `docs/screenshots/${vp}-${theme}-10-capcom-open.png` });
    await page.getByTestId("starter").filter({ hasText: "strongest measurable" }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `docs/screenshots/${vp}-${theme}-11-capcom-answer.png` });
    await ctx.close();
  }
  // design system + terminal (light)
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/design-system?noboot`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `docs/screenshots/${vp}-light-12-design-system.png` });
  await page.locator("#motion").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `docs/screenshots/${vp}-light-13-design-system-motion.png` });
  if (vp === "desktop") {
    await page.goto(`${BASE}/u/dhruv-goyal?noboot`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.keyboard.press("`");
    await page.getByLabel("Terminal command").fill("cat zolve");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);
    await page.screenshot({ path: `docs/screenshots/${vp}-light-14-terminal.png` });
  }
  await ctx.close();
}

// WebGL hero (forced full quality; this container renders GL in software)
for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext(VIEWPORTS.desktop);
  const page = await ctx.newPage();
  await page.addInitScript(forceGPU);
  await page.addInitScript((t) => localStorage.setItem("dg01.prefs", JSON.stringify({ theme: t })), theme);
  await page.goto(`${BASE}/u/dhruv-goyal?noboot&quality=high`, { waitUntil: "networkidle" });
  await page.mouse.move(980, 380);
  await page.waitForSelector('[data-testid="constellation-webgl"] canvas', { timeout: 20000 });
  await page.waitForTimeout(4000);
  await page.mouse.move(1010, 360);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `docs/screenshots/desktop-${theme}-01w-webgl.png` });
  await page.mouse.wheel(0, 1250);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `docs/screenshots/desktop-${theme}-01x-webgl-one-line.png` });
  await ctx.close();
}

// Reduced-motion version (desktop)
{
  const ctx = await browser.newContext({ ...VIEWPORTS.desktop, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/u/dhruv-goyal?noboot`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `docs/screenshots/desktop-light-15-reduced-motion.png`, fullPage: true });
  await ctx.close();
}

// Walkthrough recordings
for (const [vp, opts] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ ...opts, recordVideo: { dir: "docs/video/tmp", size: opts.viewport } });
  const page = await ctx.newPage();
  await page.addInitScript(forceGPU);
  await page.goto(`${BASE}/u/dhruv-goyal`, { waitUntil: "load" });
  await page.waitForTimeout(2600);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 140) {
    await page.mouse.wheel(0, 140);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(800);
  await page.getByTestId("capcom-orb").click();
  await page.waitForTimeout(800);
  await page.getByTestId("starter").first().click();
  await page.waitForTimeout(3000);
  const chip = page.getByTestId("source-chip").first();
  if (await chip.count()) await chip.click();
  await page.waitForTimeout(2500);
  await ctx.close();
  const f = readdirSync("docs/video/tmp").find((x) => x.endsWith(".webm"));
  if (f) renameSync(`docs/video/tmp/${f}`, `docs/video/walkthrough-${vp}.webm`);
}
await browser.close();
console.log("captured → docs/screenshots, docs/video");
