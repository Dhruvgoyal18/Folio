import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Use a pre-installed Chromium when one exists (sandbox/CI images); otherwise Playwright's own (npx playwright install chromium).
const preinstalled = "/opt/pw-browsers/chromium";
const executablePath = process.env.PW_CHROMIUM ?? (existsSync(preinstalled) ? preinstalled : undefined);
const launchOptions = {
  ...(executablePath ? { executablePath } : {}),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
};

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["json", { outputFile: "docs/reports/playwright-results.json" }], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:4173",
    trace: "retain-on-failure",
    launchOptions,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run serve", url: "http://localhost:4173", reuseExistingServer: true, timeout: 60_000, env: { CHAT_RATE_PER_MIN: "1000", CHAT_RATE_PER_DAY: "100000", CHAT_SITE_PER_DAY: "100000", EXTRACT_RATE_PER_MIN: "1000", CREATE_RATE_PER_MIN: "1000", CREATE_RATE_PER_DAY: "100000", SITES_STORE: "memory" } },
});
