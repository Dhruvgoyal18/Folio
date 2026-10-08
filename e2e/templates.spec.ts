import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { open, goTo, watchConsole, SHOWCASE } from "./helpers";

/** Templates gallery, every template rendered for real, the impact section and the template → studio flow. */
const CONCEPTS = ["mission", "editorial", "terminal", "minimal", "noir", "brutalist", "aurora", "scholar", "blueprint"] as const;
const SEEDS: Record<(typeof CONCEPTS)[number], number> = { mission: 11, editorial: 23, terminal: 37, minimal: 41, noir: 53, brutalist: 67, aurora: 71, scholar: 83, blueprint: 97 };

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

test.describe("templates gallery", () => {
  test("lists all nine templates with preview and use actions, and passes axe", async ({ page }) => {
    const c = watchConsole(page);
    await open(page, "/templates");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nine looks");
    for (const id of CONCEPTS) {
      const card = page.getByTestId(`template-${id}`);
      await expect(card).toBeVisible();
      await expect(page.getByTestId(`use-${id}`)).toHaveAttribute("href", `/create?template=${id}&seed=${SEEDS[id]}`);
    }
    await noOverflow(page);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical"), JSON.stringify(axe.violations.map((v) => v.id))).toEqual([]);
    c.expectClean();
  });

  test("live preview opens a real site, remix changes the design, use carries the design to the studio", async ({ page, isMobile }) => {
    await open(page, "/templates");
    await page.getByTestId("preview-noir").click();
    const dialog = page.getByTestId("template-preview");
    await expect(dialog).toBeVisible();
    const frame = page.frameLocator('[data-testid="template-frame"]');
    await expect(frame.getByRole("heading", { level: 1 })).toContainText("Dhruv", { timeout: 20_000 });
    await expect(frame.locator("html")).toHaveAttribute("data-concept", "noir");
    const before = await page.getByTestId("template-use").getAttribute("href");
    await page.getByTestId("template-remix").click();
    await expect(page.getByTestId("template-use")).not.toHaveAttribute("href", before!);
    await expect(frame.locator("html")).toHaveAttribute("data-concept", "noir", { timeout: 20_000 });
    if (!isMobile) {
      await dialog.getByRole("tab", { name: "phone" }).click();
      expect(await page.getByTestId("template-frame").evaluate((f) => (f as HTMLIFrameElement).style.width)).toBe("390px");
    }
    const href = (await page.getByTestId("template-use").getAttribute("href"))!;
    expect(href).toMatch(/^\/create\?template=noir&seed=\d+$/);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("using a template starts the studio with that template selected", async ({ page, isMobile }) => {
    test.skip(isMobile, "studio desktop flow");
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page, "/create?template=blueprint&seed=97");
    await expect(page.getByTestId("template-banner")).toContainText("Blueprint");
    await page.getByTestId("use-sample").click();
    await expect(page.locator('[data-testid^="ready-ok"]:visible').first()).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("to-design").click();
    await expect(page.getByTestId("concept-blueprint")).toHaveAttribute("aria-checked", "true");
    const preview = page.frameLocator('[data-testid="preview-frame"]');
    await expect(preview.locator("html")).toHaveAttribute("data-concept", "blueprint", { timeout: 20_000 });
    // switching template in the studio
    await page.getByTestId("concept-aurora").click();
    await expect(preview.locator("html")).toHaveAttribute("data-concept", "aurora", { timeout: 20_000 });
  });
});

test.describe("every template renders", () => {
  for (const concept of CONCEPTS) {
    test(`${concept}: hero, numbers and contact render cleanly`, async ({ page }) => {
      const c = watchConsole(page);
      await open(page, `/site?demo=${concept}&seed=${SEEDS[concept]}`, { motion: "reduced" });
      await expect(page.locator("html")).toHaveAttribute("data-concept", concept);
      await expect(page.locator("#hero-name")).toBeVisible();
      await expect(page.locator("#hero-name")).toContainText(/Dhruv/i);
      await noOverflow(page);
      // chapters mount progressively after the hero
      await page.locator("#comms").waitFor({ state: "attached", timeout: 15_000 });
      await page.locator("#telemetry").waitFor({ state: "attached", timeout: 15_000 });
      await goTo(page, "telemetry");
      const kinds = await page.locator('#telemetry [data-testid="kpi"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")));
      expect(kinds).toEqual(["change", "share", "reduction", "lift", "count", "count"]);
      await goTo(page, "comms");
      await expect(page.locator("#comms")).toBeVisible();
      await noOverflow(page);
      // reveal every chapter first (titles fade in once on first view); otherwise axe's own scrolling
      // catches a title mid-fade and reports the blended colour as low contrast
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.5) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
      });
      await page.waitForTimeout(400); // the reduced-motion fade is 150 ms
      // axe scrolls while it measures, which moves the active-chapter pill mid-check; the nav's own contrast
      // is covered by a11y.spec, so it is excluded here
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).exclude('nav[aria-label="Chapters"] ol').analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length} — ${v.nodes[0]?.target} ${v.nodes[0]?.failureSummary?.slice(0, 160)}`)).toEqual([]);
      c.expectClean();
    });
  }
});

test.describe("showcase impact and order", () => {
  test("numbers carry context, a reading and their source line", async ({ page }) => {
    await open(page, SHOWCASE, { motion: "reduced" });
    await goTo(page, "telemetry");
    const first = page.locator('#telemetry [data-testid="kpi"]').first();
    await expect(first).toContainText("Text-to-SQL Copilot");
    await expect(first).toContainText("Text-to-SQL accuracy");
    await expect(first).toContainText("+19 points");
    await expect(first).toContainText("68%");
    const memory = page.locator('#telemetry [data-kind="reduction"]');
    await expect(memory).toContainText("≈1,400× less than before");
    // the source bullet is one click away
    await first.locator("summary").click();
    await expect(first).toContainText("improving SQL accuracy from 68% to 87%");
  });

  test("the hero shows a summary and proof points; roles run current-first", async ({ page }) => {
    await open(page, SHOWCASE, { motion: "reduced" });
    await expect(page.getByTestId("hero-proof")).toContainText("IIT Kharagpur");
    await expect(page.getByTestId("hero-proof")).toContainText("Gold Medal, Inter IIT 12.0");
    await goTo(page, "trajectory");
    const roles = await page.locator("#trajectory article[id^='exp-']").evaluateAll((els) => els.map((e) => e.id));
    expect(roles).toEqual(["exp-zolve", "exp-nus", "exp-iitkgp-ai", "exp-titan"]);
  });
});
