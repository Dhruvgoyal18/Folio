import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { open, goTo, SHOWCASE } from "./helpers";

const variants = [
  { name: "light", prefs: { theme: "light", motion: "reduced" } },
  { name: "dark", prefs: { theme: "dark", motion: "reduced" } },
];

for (const v of variants) {
  test(`axe: home (${v.name}) has no WCAG 2.2 A/AA violations`, async ({ page }, info) => {
    await open(page, SHOWCASE, v.prefs);
    // Nav scanned at rest: its active-chapter pill follows scroll, and axe's own scrolling
    // during the full-page scan can catch it mid-update.
    const nav = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).include("header").analyze();
    expect(nav.violations.map((x) => `${x.id}: ${x.nodes[0]?.target}`)).toEqual([]);
    for (const id of ["telemetry", "trajectory", "payload", "missions", "training", "comms"]) await goTo(page, id);
    await page.waitForTimeout(1200); // let the nav's active-chapter state settle before sampling colours
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude("canvas").exclude("header").analyze();
    mkdirSync("docs/reports/axe", { recursive: true });
    writeFileSync(`docs/reports/axe/home-${v.name}-${info.project.name}.json`, JSON.stringify({ violations: r.violations, passes: r.passes.length, incomplete: r.incomplete.map((i) => i.id) }, null, 2));
    expect(r.violations.map((x) => `${x.id}: ${x.nodes.length} — ${x.nodes[0]?.target}`)).toEqual([]);
  });
}

test("axe: chat panel open", async ({ page }) => {
  await open(page, SHOWCASE, { motion: "reduced" });
  await page.getByTestId("capcom-orb").click();
  await page.getByTestId("starter").first().click();
  await expect(page.getByTestId("assistant-message").last()).toHaveAttribute("data-status", "done");
  await page.waitForTimeout(800); // let entrance transitions settle before sampling colours
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).include('[data-testid="capcom-panel"]').analyze();
  expect(r.violations.map((x) => `${x.id}: ${x.nodes[0]?.target}`)).toEqual([]);
});

test("axe: design system", async ({ page }) => {
  await open(page, "/design-system", { motion: "reduced" });
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.map((x) => `${x.id}: ${x.nodes.length} — ${x.nodes[0]?.target}`)).toEqual([]);
});
