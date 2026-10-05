import { expect, type Page, type ConsoleMessage } from "@playwright/test";

/** Collects console errors and page errors; ignores known third-party deprecation warnings. */
export function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return {
    errors,
    expectClean: () => expect(errors, errors.join("\n")).toEqual([]),
  };
}

export const SHOWCASE = "/u/dhruv-goyal";

export async function open(page: Page, path = SHOWCASE, prefs?: Record<string, unknown>) {
  // Seed prefs once per tab so reload-persistence can still be tested.
  if (prefs)
    await page.addInitScript((p) => {
      if (sessionStorage.getItem("pw-seeded")) return;
      sessionStorage.setItem("pw-seeded", "1");
      localStorage.setItem("dg01.prefs", JSON.stringify(p));
      // sites remember the visitor's theme per site; seed it for every site the test may open
      if (p.theme) for (const slug of ["dhruv-goyal", "maya-chen", "e2e"]) localStorage.setItem(`dg01.site.${slug}.theme`, String(p.theme));
    }, prefs);
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}noboot`);
  await page.waitForLoadState("networkidle");
}

/** Scroll to a section through Lenis when present (so ScrollTrigger stays in sync). */
export async function goTo(page: Page, id: string) {
  await page.evaluate((id) => {
    const el = document.getElementById(id)!;
    const l = (window as unknown as { __lenis?: { scrollTo: (e: Element, o: object) => void } }).__lenis;
    if (l) l.scrollTo(el, { immediate: true, offset: -80 });
    else el.scrollIntoView();
  }, id);
  await page.waitForTimeout(700);
}
