import { test, expect } from "@playwright/test";
import { watchConsole, open, goTo, SHOWCASE } from "./helpers";

test.describe("home", () => {
  test("loads every chapter with no console errors", async ({ page }) => {
    const c = watchConsole(page);
    await open(page);
    await expect(page.getByRole("heading", { level: 1, name: "Dhruv Goyal" })).toBeVisible();
    for (const id of ["launch", "telemetry", "trajectory", "payload", "missions", "training", "comms"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    for (const id of ["telemetry", "trajectory", "payload", "missions", "training", "comms"]) await goTo(page, id);
    c.expectClean();
  });

  test("no horizontal overflow", async ({ page }) => {
    await open(page);
    for (const id of ["launch", "payload", "missions", "comms"]) {
      await goTo(page, id);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over).toBeLessThanOrEqual(1);
    }
  });

  test("boot sequence shows once per session and is skippable", async ({ page }) => {
    await page.goto(SHOWCASE);
    await expect(page.getByTestId("boot")).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("boot")).toBeHidden();
    await page.reload();
    await page.waitForTimeout(300);
    await expect(page.getByTestId("boot")).toHaveCount(0);
  });

  test("hero renders a constellation (WebGL or SVG fallback)", async ({ page }) => {
    await open(page);
    await expect(page.getByTestId("constellation-webgl").or(page.getByTestId("constellation-static")).first()).toBeVisible();
  });

  test("telemetry KPIs are quoted from resume", async ({ page }) => {
    await open(page);
    await goTo(page, "telemetry");
    const t = page.locator("#telemetry");
    for (const v of ["87%", "20+", "95%+", "400k+", "+27%", "99.93%"]) await expect(t.getByText(v, { exact: true }).first()).toBeAttached();
  });

  test("theme switch flips and persists", async ({ page }) => {
    await open(page, SHOWCASE, { theme: "light" });
    await page.getByTestId("theme-toggle").first().click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("motion toggle switches to the reduced experience", async ({ page }) => {
    await open(page, SHOWCASE, { motion: "full" });
    await page.getByTestId("motion-toggle").first().click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.getByTestId("constellation-static").first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Skills on the career line" })).toBeVisible();
  });

  test("trajectory waypoints expand and collapse", async ({ page }) => {
    await open(page);
    await goTo(page, "trajectory");
    const titan = page.locator("#exp-titan").getByRole("button", { name: /Data Analyst/ });
    await expect(titan).toHaveAttribute("aria-expanded", "false");
    await titan.click();
    await expect(titan).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#exp-titan").getByText(/SARIMAX modeling/)).toBeVisible();
    await expect(page.locator("#exp-zolve").getByRole("button").first()).toHaveAttribute("aria-expanded", "true");
  });

  test("selecting a skill lights up where it was used", async ({ page }) => {
    await open(page);
    await goTo(page, "payload");
    await page.locator("#payload").getByRole("button", { name: "Kafka", exact: true }).click();
    await expect(page.getByTestId("payload-active")).toHaveText("Kafka");
    await expect(page.locator("#payload aside").getByRole("button", { name: /Zolve/ })).toBeVisible();
    await expect(page.locator("#payload aside").getByRole("button", { name: /Multi-Agent Workflow Platform/ })).toBeVisible();
  });

  test("mission card opens a dossier dialog and Escape closes it", async ({ page }) => {
    await open(page);
    await goTo(page, "missions");
    await page.locator("#proj-dapi").click();
    const dialog = page.getByRole("dialog", { name: /DAPI Tile Classifier/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/99.93% reduction in peak memory/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("resume PDF is downloadable", async ({ page, request }) => {
    await open(page);
    const res = await request.get("/Dhruv_Goyal_Resume.pdf");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("pdf");
  });

  test("keyboard: skip link and visible focus", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow on desktop");
    await open(page);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe("none");
  });
});

test.describe("easter eggs", () => {
  test("terminal opens with ~ and runs commands", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard-only egg");
    await open(page);
    await expect(page.locator("html[data-eggs=ready]")).toHaveCount(1);
    await page.keyboard.press("`");
    const term = page.getByTestId("terminal");
    await expect(term).toBeVisible();
    await page.getByLabel("Terminal command").fill("whoami");
    await page.keyboard.press("Enter");
    await expect(term).toContainText("AI Engineer at Zolve");
    await page.getByLabel("Terminal command").fill("exit");
    await page.keyboard.press("Enter");
    await expect(term).toBeHidden();
  });

  test("konami code launches and opens the terminal", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard-only egg");
    await open(page);
    await expect(page.locator("html[data-eggs=ready]")).toHaveCount(1);
    for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) await page.keyboard.press(k);
    await expect(page.getByTestId("terminal")).toBeVisible();
  });
});

test.describe("other routes", () => {
  test("design system renders every token group and primitive", async ({ page }) => {
    const c = watchConsole(page);
    await open(page, "/design-system");
    for (const h of ["Color", "Typography", "Motion tokens", "Springs", "<Reveal>", "<SplitText>", "<Magnetic>", "<Parallax>", "<CountUp>", "<ScrollScene>", "<Marquee>", "<TiltCard>", "<GlowCursor>", "<PageTransition>", "<Skeleton>"]) {
      await expect(page.getByRole("heading", { level: 2, name: h, exact: true })).toBeAttached();
    }
    c.expectClean();
  });

  test("client navigation runs the page transition", async ({ page }) => {
    await open(page, "/design-system");
    await page.getByRole("link", { name: /See it on the showcase/ }).click();
    await expect(page.getByTestId("page-wipe")).toBeAttached();
    await expect(page.getByRole("heading", { level: 1, name: "Dhruv Goyal" })).toBeVisible();
  });

  test("unknown routes show the 404 page", async ({ page }) => {
    await page.goto("/nowhere");
    await expect(page.getByRole("heading", { name: "There's nothing at this address" })).toBeVisible();
  });
});
