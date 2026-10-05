/** Rough FPS probe: counts rAF frames while scrolling through the hero and the page. Writes docs/reports/fps.json */
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const exe = process.env.PW_CHROMIUM ?? ((await import("node:fs")).existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const out = [];
for (const mode of ["svg", "webgl"]) {
  // WebGL needs SwiftShader (software GL) here; the SVG path runs on the default compositor.
  const b = await chromium.launch({ executablePath: exe, args: mode === "webgl" ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  if (mode === "webgl") await p.addInitScript(() => { Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 }); });
  else await p.addInitScript(() => { Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 }); });
  await p.goto(`${BASE}/?noboot`, { waitUntil: "networkidle" });
  await p.mouse.move(700, 400);
  await p.waitForTimeout(3500);
  const probe = async (label, action) => {
    await p.evaluate(() => { window.__f = []; const loop = (t) => { window.__f.push(t); if (window.__f.length < 100000) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
    await action();
    const r = await p.evaluate(() => { const f = [...new Set(window.__f)]; const d = f.slice(1).map((t, i) => t - f[i]); d.sort((a, b) => a - b); return { frames: f.length, seconds: (f.at(-1) - f[0]) / 1000, p50: d[Math.floor(d.length * 0.5)], p95: d[Math.floor(d.length * 0.95)] }; });
    out.push({ mode, label, fps: Math.round(r.frames / r.seconds), p50ms: +r.p50.toFixed(1), p95ms: +r.p95.toFixed(1) });
  };
  await probe("idle hero (3s)", () => p.waitForTimeout(3000));
  await probe("scroll through hero collapse", async () => { for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, 45); await p.waitForTimeout(50); } });
  await probe("scroll rest of page", async () => { for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, 160); await p.waitForTimeout(50); } });
  out.push({ mode, label: "WebGL canvas mounted", fps: (await p.evaluate(() => !!document.querySelector('[data-testid="constellation-webgl"] canvas'))) ? "yes" : "no" });
  await b.close();
}
console.table(out);
writeFileSync("docs/reports/fps.json", JSON.stringify({ note: "Headless Chromium in a CPU-only container (WebGL via SwiftShader software rendering). Real GPUs are far faster; use these as relative numbers.", results: out }, null, 2));
