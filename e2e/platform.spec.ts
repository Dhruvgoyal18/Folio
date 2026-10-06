import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { watchConsole, open } from "./helpers";

const uniq = () => `e2e-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]');

test.describe("landing", () => {
  test("explains the product and links to create + examples", async ({ page }) => {
    const c = watchConsole(page);
    await open(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("nobody else has");
    await expect(page.getByTestId("cta-create")).toHaveAttribute("href", "/create");
    const specimens = page.locator(".specimen a");
    await expect(specimens).toHaveCount(6);
    const hrefs = await specimens.evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    expect(new Set(hrefs).size).toBe(6);
    await expect(page.getByTestId("all-templates")).toHaveAttribute("href", "/templates");
    c.expectClean();
  });
  test("axe: landing and create have no WCAG A/AA violations", async ({ page }) => {
    for (const path of ["/", "/create"]) {
      await open(page, path, { motion: "reduced" });
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(r.violations.map((x) => `${path} ${x.id}: ${x.nodes[0]?.target}`)).toEqual([]);
    }
  });
});

test.describe("generated sites", () => {
  for (const concept of ["mission", "editorial", "terminal"] as const) {
    test(`${concept} concept renders cleanly and passes axe`, async ({ page }) => {
      const c = watchConsole(page);
      await open(page, `/site?demo=${concept}&seed=4242`, { motion: "reduced" });
      await expect(page.locator("html")).toHaveAttribute("data-concept", concept);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/Dhruv/i);
      for (const id of ["trajectory", "payload", "missions", "comms"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude("canvas").exclude("header").analyze();
      expect(r.violations.map((x) => `${x.id}: ${x.nodes.length} — ${x.nodes[0]?.target}`)).toEqual([]);
      c.expectClean();
    });
  }

  test("same résumé, different seeds → visibly different designs", async ({ page }) => {
    const look = async (seed: number) => {
      await open(page, `/site?demo=mission&seed=${seed}`);
      await expect(page.locator("html")).toHaveAttribute("data-concept", "mission");
      return page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return [cs.getPropertyValue("--c-signal").trim(), cs.getPropertyValue("--ff-display").trim(), document.documentElement.dataset.heroCase, document.title];
      });
    };
    const a = await look(1);
    const b = await look(2);
    const c = await look(3);
    expect(new Set([a[0], b[0], c[0]]).size).toBeGreaterThan(1);
  });
});

test.describe("create → publish → visit → chat → edit → delete", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "studio flow runs on desktop; mobile covered by layout checks");

  test("full flow with the sample résumé", async ({ page }) => {
    test.setTimeout(180_000);
    const c = watchConsole(page);
    await open(page, "/create", { motion: "reduced" });

    // 1 · upload (sample)
    await page.getByTestId("use-sample").click();
    await expect(page.getByTestId("f-name")).toHaveValue("Maya Chen");
    await expect(page.getByTestId("exp-entry")).toHaveCount(3);
    await expect(page.getByTestId("ready-ok")).toContainText("3 roles");

    // 2 · review: edit the headline
    await page.getByTestId("f-headline").fill("Product designer for calm software");
    await page.getByTestId("to-design").click();

    // 3 · design: preview renders the draft; concept switch + remix change it
    await expect(preview(page).getByRole("heading", { level: 1 })).toContainText("Maya", { timeout: 20_000 });
    await page.getByTestId("concept-terminal").click();
    await expect(page.getByTestId("concept-terminal")).toHaveAttribute("aria-checked", "true");
    await expect(preview(page).locator("html")).toHaveAttribute("data-concept", "terminal");
    const seed1 = await page.getByTestId("genome-summary").textContent();
    await page.getByTestId("lock-concept").click();
    await page.getByTestId("remix").click();
    await expect(page.getByTestId("genome-summary")).not.toHaveText(seed1!);
    await expect(preview(page).locator("html")).toHaveAttribute("data-concept", "terminal"); // locked
    await page.getByTestId("to-publish").click();

    // 4 · publish
    const slug = uniq();
    await expect(page.getByTestId("slug")).toHaveValue(/maya-chen/); // the suggested address arrives first
    await page.getByTestId("slug").fill(slug);
    await expect(page.locator("#slug-status")).toHaveText("Available");
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("published")).toBeVisible();
    const editUrl = (await page.getByTestId("edit-url").textContent())!;
    expect(editUrl).toContain(`/create?edit=${slug}#token=`);

    // 5 · visit the live site (edge-injected HTML, no-JS fallback included)
    const html = await (await page.request.get(`/u/${slug}`)).text();
    expect(html).toContain('<script id="site-data"');
    expect(html).toContain("<noscript>");
    expect(html).toContain('data-concept="terminal"');
    await page.goto(`/u/${slug}?noboot`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Maya");
    await expect(page).toHaveTitle(/Maya Chen/);

    // 6 · chat is grounded in Maya's résumé
    await page.getByTestId("capcom-orb").click();
    const input = page.getByTestId("capcom-input");
    await input.fill("Where did she study?");
    await input.press("Enter");
    await expect(page.getByTestId("assistant-message").last()).toHaveAttribute("data-status", "done", { timeout: 20_000 });
    await expect(page.getByTestId("assistant-message").last()).toContainText("California College of the Arts");

    // 7 · edit via the private link
    await page.goto(editUrl);
    await expect(page.locator("main")).toHaveAttribute("data-step", "design");
    await page.getByTestId("to-publish").click();
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("published")).toContainText("Changes saved");

    // a wrong token is refused
    await page.goto("/");
    await page.goto(editUrl.replace(/token=.*/, "token=not-the-right-token-at-all-xxxxxx"));
    await expect(page.getByText(/isn't valid for that site/)).toBeVisible();

    // 8 · delete
    await page.goto("/");
    await page.goto(editUrl);
    await page.getByTestId("to-publish").click();
    await page.getByTestId("delete").click();
    await page.getByTestId("confirm-delete").click();
    await page.waitForURL("**/");
    expect((await page.request.get(`/api/sites/${slug}`)).status()).toBe(404);
    // the only expected console noise is the deliberate 401 from the wrong edit token
    expect(c.errors.filter((e) => !/status of 401/.test(e))).toEqual([]);
  });

  test("uploading a real PDF résumé fills the review form", async ({ page }) => {
    await open(page, "/create");
    await page.getByTestId("resume-file").setInputFiles("tests/fixtures/dhruv.pdf");
    await expect(page.getByTestId("f-name")).toHaveValue("Dhruv Goyal", { timeout: 20_000 });
    await expect(page.getByTestId("exp-entry")).toHaveCount(4);
    await expect(page.getByTestId("exp-entry").first()).toContainText("Zolve");
    await expect(page.getByTestId("ready-ok")).toBeVisible();
  });

  test("a résumé with positions of responsibility + coursework is fully placed and valid", async ({ page }) => {
    await open(page, "/create");
    await page.getByTestId("resume-file").setInputFiles("tests/fixtures/por-coursework.pdf");
    await expect(page.getByTestId("ready-ok")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("ready-error")).toHaveCount(0);
    await expect(page.getByTestId("exp-entry").filter({ hasText: "General Secretary" })).toHaveCount(1);
    await expect(page.getByTestId("unplaced")).toHaveCount(0);
    await page.getByTestId("to-design").click();
    await expect(page.frameLocator('[data-testid="preview-frame"]').getByRole("heading", { level: 1 })).toContainText("Dhruv", { timeout: 20_000 });
  });

  test("lines the parser can't place can be added or dismissed", async ({ page }) => {
    await open(page, "/create");
    await page.getByRole("button", { name: /paste text instead/i }).click();
    await page.locator("#paste-text").fill("Ana Ruiz\nana@example.com\nExperience\nDesigner at Studio Uno\t2020 – Present\n• Ran 30+ workshops\nPublications\nRuiz A. (2022). Calm interfaces. CHI.\nSpanish (native), English (fluent)");
    await page.getByRole("button", { name: "Use this text" }).click();
    const list = page.getByTestId("unplaced");
    await expect(list.locator("li")).toHaveCount(2);
    await list.locator("li").first().getByRole("button", { name: "+ Honours" }).click();
    await expect(list.locator("li")).toHaveCount(1);
    await list.locator("li").first().getByRole("button", { name: /Dismiss/ }).click();
    await expect(page.getByTestId("unplaced")).toHaveCount(0);
    await expect(page.getByTestId("ready-ok")).toBeVisible();
  });

  test("rejects unreadable files with a helpful message", async ({ page }) => {
    await open(page, "/create");
    await page.getByTestId("resume-file").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) });
    await expect(page.getByTestId("upload-status")).toContainText(/PDF, DOCX or text/);
  });
});
