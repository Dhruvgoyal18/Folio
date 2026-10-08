/**
 * Deterministic design audit (no AI): renders every page and template and checks rules taken from
 * Vercel's Web Interface Guidelines, Anthropic's frontend-design skill and Impeccable's detector
 * ideas. Failures are objective defects; "tells" are generated-looking defaults worth a second look.
 *
 *   node scripts/audit-design.mjs [baseUrl]      (needs `npm run serve` running)
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { audit } from "./design-rules.mjs";

const BASE = process.argv[2] ?? "http://localhost:4173";
const pre = "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? (existsSync(pre) ? pre : undefined) });
const CONCEPTS = { mission: 11, editorial: 23, terminal: 37, minimal: 41, noir: 53, brutalist: 67, aurora: 71, scholar: 83, blueprint: 97 };
const PAGES = [
  ["landing", "/"],
  ["templates", "/templates"],
  ["create", "/create"],
  ["showcase", "/u/dhruv-goyal"],
  ...Object.entries(CONCEPTS).map(([c, s]) => [`site:${c}`, `/site?demo=${c}&seed=${s}`]),
];

const report = [];
let total = 0;
for (const [name, path] of PAGES) {
  for (const mobile of [false, true]) {
    const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}noboot`, { waitUntil: "networkidle" });
    // let progressive chapters mount, then walk the page so in-view content renders
    await page.waitForTimeout(800);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    const r = await page.evaluate(audit, mobile);
    total += r.fails.length;
    report.push({ page: name, viewport: mobile ? "phone" : "desktop", ...r });
    await ctx.close();
  }
}
await browser.close();

mkdirSync("docs/reports", { recursive: true });
writeFileSync("docs/reports/design-audit.json", JSON.stringify(report, null, 2));
for (const r of report) {
  const rules = Object.entries(r.fails.reduce((a, f) => ({ ...a, [f.rule]: (a[f.rule] ?? 0) + 1 }), {}));
  console.log(`${r.page.padEnd(16)} ${r.viewport.padEnd(8)} fails: ${String(r.fails.length).padStart(3)}  ${rules.map(([k, v]) => `${k}×${v}`).join(" ")}   tells: caps ${r.tells.allCapsLabels}, arrows ${r.tells.arrowLinks}, dots ${r.tells.middleDotStrings}`);
}
console.log(`\n${total} failures. Details: docs/reports/design-audit.json`);
process.exitCode = total ? 1 : 0;
