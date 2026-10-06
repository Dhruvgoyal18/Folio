import { test, expect } from "@playwright/test";
import { open, goTo, SHOWCASE } from "./helpers";

/** Published-site rendering details that every résumé depends on. */
test.describe("published sites", () => {
  test.skip(({ isMobile }) => isMobile, "desktop nav");
  test.use({ viewport: { width: 1280, height: 720 } });

  test("the nav follows the reader through chapters that mount after load", async ({ page }) => {
    await open(page, SHOWCASE, { motion: "reduced" });
    for (const id of ["trajectory", "missions", "comms"]) {
      await goTo(page, id);
      await expect(page.locator(`nav[aria-label="Chapters"] a[href="#${id}"]`)).toHaveAttribute("aria-current", "true");
    }
  });

  test("chapter links stay on one line at laptop width in every concept", async ({ page }) => {
    for (const concept of ["mission", "editorial", "terminal", "minimal", "noir", "brutalist", "aurora", "scholar", "blueprint"]) {
      await open(page, `/site?demo=${concept}&seed=23`, { motion: "reduced" });
      const heights = await page.locator('nav[aria-label="Chapters"] ol a').evaluateAll((as) => as.map((a) => a.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(3);
      for (const h of heights) expect(h).toBeLessThan(40);
    }
  });

  test("type stays in proportion: section titles ≤ 56px, body ≤ 18px at 1280px", async ({ page }) => {
    await open(page, SHOWCASE, { motion: "reduced" });
    await goTo(page, "trajectory");
    const s = await page.evaluate(() => ({
      h2: parseFloat(getComputedStyle(document.querySelector("#trajectory h2")!).fontSize),
      body: parseFloat(getComputedStyle(document.body).fontSize),
      h1: parseFloat(getComputedStyle(document.querySelector("#hero-name")!).fontSize),
    }));
    expect(s.h2).toBeLessThanOrEqual(56);
    expect(s.body).toBeLessThanOrEqual(18);
    expect(s.h1).toBeLessThanOrEqual(110);
  });
});
