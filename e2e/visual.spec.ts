import { test, expect } from "@playwright/test";
import { open, goTo } from "./helpers";

/**
 * Visual regression for every template (opt-in: VISUAL=1). Screenshots depend on OS, browser build
 * and fonts, so baselines are only comparable on the machine that made them:
 *   VISUAL=1 npx playwright test e2e/visual.spec.ts --project=desktop --update-snapshots   # record
 *   VISUAL=1 npx playwright test e2e/visual.spec.ts --project=desktop                      # compare
 * Review the diff images in test-results/ before accepting a change.
 */
test.skip(!process.env.VISUAL, "visual baselines are machine-specific; set VISUAL=1");

const SEEDS = { mission: 11, editorial: 23, terminal: 37, minimal: 41, noir: 53, brutalist: 67, aurora: 71, scholar: 83, blueprint: 97 } as const;

for (const [concept, seed] of Object.entries(SEEDS)) {
  test(`${concept}: hero and impact numbers`, async ({ page }) => {
    await open(page, `/site?demo=${concept}&seed=${seed}`, { motion: "reduced", sound: false });
    await page.mouse.move(-1, -1);
    await expect(page).toHaveScreenshot(`${concept}-hero.png`, { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.01 });
    await page.locator("#telemetry").waitFor({ state: "attached" });
    await goTo(page, "telemetry");
    await expect(page.locator("#telemetry")).toHaveScreenshot(`${concept}-telemetry.png`, { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.01 });
  });
}

test("templates gallery", async ({ page }) => {
  await open(page, "/templates");
  await page.mouse.move(-1, -1);
  await expect(page.getByTestId("template-grid")).toHaveScreenshot("templates-grid.png", { animations: "disabled", maxDiffPixelRatio: 0.01 });
});
