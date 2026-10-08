import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { open, watchConsole } from "./helpers";

/**
 * Editing, end to end: content edits with undo/redo, reorder and duplicate in Review; chapters,
 * featured numbers, case files and wording in Design › Content; publishing those choices; reopening
 * them from the edit link and from the owner-only "Edit site" button; and saving a second round.
 */
const uniq = () => `ed-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]');

async function sampleToReview(page: Page) {
  await open(page, "/create");
  await page.getByTestId("use-sample").click();
  await expect(page.locator('[data-testid^="ready-ok"]:visible').first()).toBeVisible({ timeout: 20_000 });
}

test.describe("editing · review", () => {
  test.skip(({ isMobile }) => isMobile, "desktop editor layout");
  test.use({ viewport: { width: 1280, height: 860 } });

  test("add, duplicate, reorder and remove entries, with undo and redo", async ({ page }) => {
    const c = watchConsole(page);
    await sampleToReview(page);
    const roles = page.getByTestId("exp-entry");
    const n = await roles.count();
    await expect(page.getByTestId("undo")).toBeDisabled();

    // add → undo → redo
    await page.getByRole("button", { name: "Add role" }).click();
    await expect(roles).toHaveCount(n + 1);
    await page.getByTestId("undo").click();
    await expect(roles).toHaveCount(n);
    await page.getByTestId("redo").click();
    await expect(roles).toHaveCount(n + 1);
    await page.getByTestId("undo").click();

    // duplicate the first role, move the copy down, then remove it
    const first = roles.first();
    const title = (await first.locator("summary").innerText()).split("\n")[0]!;
    await first.locator("summary").click();
    await first.getByTestId("duplicate").click();
    await expect(roles).toHaveCount(n + 1);
    await expect(roles.nth(1).locator("summary")).toContainText(title);
    await roles.nth(1).locator("summary").click();
    await roles.nth(1).getByRole("button", { name: /Move .* down/ }).click();
    await expect(roles.nth(2).locator("summary")).toContainText(title);
    await roles.nth(2).getByTestId("remove").click();
    await expect(roles).toHaveCount(n);

    // keyboard undo outside text fields brings the removed copy back
    await page.locator("h1").click();
    await page.keyboard.press("Control+z");
    await expect(roles).toHaveCount(n + 1);
    await page.keyboard.press("Control+Shift+z");
    await expect(roles).toHaveCount(n);

    // typing is one undo step per pause, and the field keeps its own native undo
    await page.getByTestId("f-headline").fill("Design lead for calm software");
    await page.waitForTimeout(900);
    await page.getByTestId("undo").click();
    await expect(page.getByTestId("f-headline")).not.toHaveValue("Design lead for calm software");
    c.expectClean();
  });
});

test.describe("editing · design content, publish and re-edit", () => {
  test.skip(({ isMobile }) => isMobile, "desktop editor layout");
  test.use({ viewport: { width: 1440, height: 900 } });

  test("chapters, numbers, case files and wording flow through publish, the edit link and the owner button", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const c = watchConsole(page);
    await sampleToReview(page);
    await page.getByTestId("to-design").click();
    await expect(preview(page).getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("panel-content").click();

    // chapters: hide Skills, move Case files to the top
    await page.getByTestId("show-payload").uncheck();
    await expect(preview(page).locator("#payload")).toHaveCount(0);
    // (move down once first, so the order is an explicit choice even when the template already leads with case files)
    await page.getByRole("button", { name: "Move Case files down" }).click();
    for (let i = 0; i < 6; i++) {
      const up = page.getByRole("button", { name: "Move Case files up" });
      if (await up.isDisabled()) break;
      await up.click();
    }
    await expect(page.getByTestId("custom-chapters").locator("li").first()).toContainText("Case files");
    await expect.poll(async () => preview(page).locator("main section[id]").evaluateAll((els) => els.map((e) => e.id).filter((id) => id !== "launch")[0])).toBe("missions");

    // numbers: relabel the first featured number, drop the last
    await page.getByTestId("custom-numbers").locator("summary").first().click();
    const firstLabel = page.getByTestId("metric-label").first();
    await firstLabel.fill("Faster patient intake");
    const before = await page.getByTestId("featured-metric").count();
    await page.getByTestId("featured-metric").last().getByRole("button", { name: /Remove .* from featured/ }).click();
    await expect(page.getByTestId("featured-metric")).toHaveCount(before - 1);
    await expect(preview(page).locator("#telemetry")).toContainText("Faster patient intake");

    // case files: rename the first one
    await page.getByTestId("custom-projects").locator("summary").first().click();
    const proj = page.getByTestId("custom-project").first();
    await proj.locator("summary").click();
    await proj.getByTestId("project-title").fill("Patient intake redesign");
    await expect(preview(page).locator("#missions")).toContainText("Patient intake redesign");

    // wording: retitle the numbers chapter and rename the assistant
    await page.getByTestId("custom-wording").locator("summary").click();
    await page.getByTestId("copy-section").selectOption("telemetry");
    await page.getByTestId("copy-title").fill("What changed because of my work");
    await page.getByTestId("copy-assistant").fill("Maya's desk");
    await expect(preview(page).locator("#telemetry h2")).toContainText("What changed because of my work");

    // a remix keeps the owner's wording
    await page.getByTestId("panel-look").click();
    await page.getByTestId("remix").click();
    await expect(preview(page).locator("#telemetry h2")).toContainText("What changed because of my work", { timeout: 20_000 });

    // publish
    await page.getByTestId("to-publish").click();
    const slug = uniq();
    await page.getByTestId("slug").fill(slug);
    await expect(page.locator("#slug-status")).toHaveText("Available");
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("published")).toBeVisible();
    const editUrl = await page.getByTestId("edit-url").innerText();

    // the published site shows exactly those choices
    await page.goto(`/u/${slug}?noboot`);
    await page.waitForLoadState("networkidle");
    await page.locator("#comms").waitFor({ state: "attached", timeout: 15_000 });
    await expect(page.locator("#payload")).toHaveCount(0);
    await expect(page.locator("#telemetry h2")).toContainText("What changed because of my work");
    await expect(page.locator("#telemetry")).toContainText("Faster patient intake");
    await expect(page.locator("#missions")).toContainText("Patient intake redesign");
    // chapters are separate chunks that resolve independently: wait for them all before reading the order
    for (const id of ["missions", "telemetry", "trajectory", "training"]) await page.locator(`#${id}`).waitFor({ state: "attached" });
    expect(await page.locator("main section[id]").evaluateAll((els) => els.map((e) => e.id).filter((id) => id !== "launch")[0])).toBe("missions");

    // the owner sees "Edit site" (this browser published it); a visitor doesn't
    await expect(page.getByTestId("owner-edit")).toBeVisible();
    const visitor = await browser.newPage();
    await visitor.goto(`/u/${slug}?noboot`);
    await visitor.waitForLoadState("networkidle");
    await expect(visitor.locator("#hero-name")).toBeVisible();
    await expect(visitor.getByTestId("owner-edit")).toHaveCount(0);
    await visitor.close();

    // reopen through the owner button: every choice is restored
    await page.getByTestId("owner-edit").click();
    await expect(page.getByTestId("panel-content")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("panel-content").click();
    await expect(page.getByTestId("show-payload")).not.toBeChecked();
    await page.getByTestId("custom-numbers").locator("summary").first().click();
    await expect(page.getByTestId("metric-label").first()).toHaveValue("Faster patient intake");

    // second round: bring Skills back, switch numbers to automatic, save
    await page.getByTestId("show-payload").check();
    await page.getByTestId("numbers-auto").click();
    await page.getByTestId("to-publish").click();
    await expect(page.getByTestId("publish")).toHaveText("Save changes");
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("published")).toContainText("Changes saved");

    await page.goto(`/u/${slug}?noboot`);
    await page.waitForLoadState("networkidle");
    await page.locator("#comms").waitFor({ state: "attached", timeout: 15_000 });
    await expect(page.locator("#payload")).toHaveCount(1);
    await expect(page.locator("#telemetry")).not.toContainText("Faster patient intake");
    await expect(page.locator("#missions")).toContainText("Patient intake redesign");

    // the saved edit link also works in a fresh browser (no remembered token)
    const other = await browser.newPage();
    await other.goto(editUrl.replace(/^https?:\/\/[^/]+/, ""));
    await expect(other.getByTestId("panel-content")).toBeVisible({ timeout: 20_000 });
    await other.close();
    c.expectClean();
  });

  test("the content panel is accessible", async ({ page }) => {
    await sampleToReview(page);
    await page.getByTestId("to-design").click();
    await page.getByTestId("panel-content").click();
    for (const g of ["custom-numbers", "custom-projects", "custom-wording"]) await page.getByTestId(g).locator("summary").first().click();
    const r = await new AxeBuilder({ page }).include('[data-testid="customize"]').withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
});

test.describe("editing · phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone layout");
  test("the content tab works on a phone and updates the preview", async ({ page }) => {
    await sampleToReview(page);
    await page.getByTestId("to-design-mobile").click();
    await page.getByTestId("panel-content").click();
    await page.getByTestId("show-training").uncheck();
    await page.getByRole("tab", { name: "preview" }).click();
    await expect(preview(page).locator("#hero-name")).toBeVisible({ timeout: 20_000 });
    await expect(preview(page).locator("#training")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});
