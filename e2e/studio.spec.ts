import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { open, watchConsole } from "./helpers";

/**
 * Studio behaviours beyond the happy path: layout at laptop size, compact type, persistence,
 * editing after publishing, theme isolation, the scaled preview, and the phone layout.
 */
const uniq = () => `st-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]');
const ready = (page: Page) => page.locator('[data-testid^="ready-ok"]:visible').first();

async function sampleToReview(page: Page) {
  await page.getByTestId("use-sample").click();
  await expect(ready(page)).toBeVisible({ timeout: 20_000 });
}

test.describe("studio · desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop layout");
  test.use({ viewport: { width: 1280, height: 720 } });

  test("compact product type: body ≤ 15px, inputs ≤ 15px, no horizontal scroll", async ({ page }) => {
    await open(page, "/create");
    await sampleToReview(page);
    const sizes = await page.evaluate(() => {
      const px = (sel: string) => parseFloat(getComputedStyle(document.querySelector(sel)!).fontSize);
      return { body: px(".app"), input: px('[data-testid="f-name"]'), label: px(".label"), h1: px("h1"), overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(sizes.body).toBeLessThanOrEqual(15);
    expect(sizes.input).toBeLessThanOrEqual(15);
    expect(sizes.label).toBeGreaterThanOrEqual(12);
    expect(sizes.h1).toBeLessThanOrEqual(40);
    expect(sizes.overflow).toBeLessThanOrEqual(1);
  });

  test("entries collapse to one line and open into their form; section index tracks scrolling", async ({ page }) => {
    await open(page, "/create");
    await sampleToReview(page);
    const first = page.getByTestId("exp-entry").first();
    await expect(first).toContainText("Senior Product Designer · Lumen Health");
    await expect(first).toContainText("4 bullets");
    await expect(first.getByLabel("Role")).toBeHidden();
    await first.locator("summary").click();
    await expect(first.getByLabel("Role")).toHaveValue("Senior Product Designer");
    await first.getByLabel("Role").fill("Lead Product Designer");
    await expect(first.locator("summary")).toContainText("Lead Product Designer");
    await page.getByRole("link", { name: "Honours" }).click();
    await expect(page.getByRole("link", { name: "Honours" })).toHaveAttribute("aria-current", "true");
  });

  test("work in progress survives a reload, and Start over clears it", async ({ page }) => {
    await open(page, "/create");
    await sampleToReview(page);
    await page.getByTestId("f-headline").fill("Draft that must survive");
    await page.waitForTimeout(300);
    await page.reload();
    await expect(page.getByTestId("f-headline")).toHaveValue("Draft that must survive");
    await page.getByRole("button", { name: "Start over" }).click();
    await expect(page.getByTestId("use-sample")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("use-sample")).toBeVisible();
  });

  test("after publishing, Keep editing saves to the same site instead of publishing a copy", async ({ page }) => {
    await open(page, "/create");
    await sampleToReview(page);
    await page.getByTestId("to-design").click();
    await expect(preview(page).getByRole("heading", { level: 1 })).toContainText("Maya", { timeout: 20_000 });
    await page.getByTestId("to-publish").click();
    const slug = uniq();
    await expect(page.getByTestId("slug")).toHaveValue(/maya-chen/);
    await page.getByTestId("slug").fill(slug);
    await expect(page.locator("#slug-status")).toHaveText("Available");
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("published")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/create\\?edit=${slug}#token=`));
    await page.getByTestId("keep-editing").click();
    await page.getByTestId("remix").click();
    await page.getByTestId("to-publish").click();
    await expect(page.getByTestId("publish")).toHaveText("Save changes");
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("published")).toContainText("Changes saved");
    // still exactly one site at that address, and no "-2" copy
    expect((await page.request.get(`/api/sites/${slug}`)).status()).toBe(200);
    expect((await page.request.get(`/api/sites/${slug}-2`)).status()).toBe(404);
  });

  test("visiting a site in its own theme never changes the studio's theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await open(page, "/create");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await open(page, "/site?demo=terminal&seed=37"); // a dark-by-default genome
    await expect(page.locator("html")).toHaveAttribute("data-concept", "terminal");
    await open(page, "/create");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    // and the studio's own toggle works and persists
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("preview scales a real desktop layout and a phone frame; remix keeps the scroll position", async ({ page }) => {
    const c = watchConsole(page);
    await open(page, "/create");
    await sampleToReview(page);
    await page.getByTestId("to-design").click();
    const frame = page.getByTestId("preview-frame");
    await expect(preview(page).getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    expect(await frame.evaluate((f) => (f as HTMLIFrameElement).style.width)).toBe("1366px");
    await expect(page.getByText(/Live preview · .* · \d+%/)).toBeVisible();
    await page.getByRole("button", { name: "mobile" }).click();
    expect(await frame.evaluate((f) => (f as HTMLIFrameElement).style.width)).toBe("390px");
    await page.getByRole("button", { name: "desktop" }).click();
    // scroll the preview, remix, and stay roughly in place
    await preview(page).locator("body").evaluate(() => window.scrollTo(0, 900));
    await page.getByTestId("lock-concept").click();
    await page.getByTestId("remix").click();
    await page.waitForTimeout(900);
    const y = await preview(page).locator("body").evaluate(() => window.scrollY);
    expect(y).toBeGreaterThan(400);
    // the left panel never pushes the page into a scroll at laptop height
    expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThan(40);
    c.expectClean();
  });

  test("axe: every studio step in light and dark", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.addInitScript((t) => {
        sessionStorage.removeItem("folio.studio");
        localStorage.setItem("dg01.prefs", JSON.stringify({ theme: t, motion: "reduced" }));
      }, scheme);
      await open(page, "/create");
      const scan = async (label: string) => {
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude('[data-testid="preview-frame"]').analyze();
        expect(r.violations.map((v) => `${scheme}/${label} ${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
      };
      await scan("upload");
      await sampleToReview(page);
      await page.getByTestId("exp-entry").first().locator("summary").click();
      await scan("review");
      await page.getByTestId("to-design").click();
      await expect(preview(page).getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
      await scan("design");
      await page.getByTestId("to-publish").click();
      await expect(page.getByTestId("slug")).toHaveValue(/maya-chen/);
      await scan("publish");
    }
  });
});

test.describe("studio · phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone layout");

  test("review has a sticky action bar; design switches between controls and preview", async ({ page }) => {
    const c = watchConsole(page);
    await open(page, "/create");
    await sampleToReview(page);
    const bar = page.getByTestId("to-design-mobile");
    await expect(bar).toBeVisible();
    await page.mouse.wheel(0, 2000);
    await expect(bar).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await bar.click();
    await expect(page.getByTestId("remix")).toBeVisible();
    await expect(page.getByTestId("preview-frame")).toBeHidden();
    await page.getByRole("tab", { name: "preview" }).click();
    await expect(page.getByTestId("preview-frame")).toBeVisible();
    await expect(preview(page).getByRole("heading", { level: 1 })).toContainText("Maya", { timeout: 20_000 });
    await page.getByRole("tab", { name: "controls" }).click();
    await page.getByTestId("to-publish").click();
    await expect(page.getByTestId("slug")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    c.expectClean();
  });
});
