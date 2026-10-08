import { test, expect, type Page } from "@playwright/test";
import { watchConsole } from "./helpers";
import { normalize } from "@/extract/normalize";
import { DraftSchema, type DraftInput } from "@/extract/draft";
import { generateGenome } from "@/genome/generate";
import type { Concept } from "@/genome/schema";
// @ts-expect-error — plain ES module shared with scripts/audit-design.mjs
import { audit } from "../scripts/design-rules.mjs";

/**
 * Published sites built from awkward résumés: every template has to handle very little content,
 * very long content, other scripts and odd shapes without errors, overflow or design-rule failures.
 * Each case is published through the real API and opened at /u/<slug>.
 */
const bullet = (s: string) => s;
const EDGE: Record<string, DraftInput> = {
  noNumbers: {
    name: "Ana Ruiz",
    email: "ana@example.com",
    experience: [{ org: "Lumen Studio", role: "Illustrator", start: "Mar 2021", end: "Present", groups: [{ bullets: [bullet("Illustrated editorial covers for national magazines"), bullet("Art-directed a children's book series")] }] }],
    education: [{ institution: "Escola Massana", degree: "BA Illustration", start: "2016", end: "2020" }],
    skills: [{ items: ["Procreate", "Gouache", "Typography"] }],
  },
  educationOnly: {
    name: "Kofi",
    email: "kofi@example.com",
    education: [{ institution: "University of Ghana", degree: "BSc Computer Science", start: "2022", end: "2026", coursework: ["Algorithms", "Databases"] }],
    awards: [{ text: "Dean's List, 2024" }],
  },
  veryLong: {
    name: "Maximiliana Alexandrina Featherstonehaugh-Montgomery",
    headline: "Principal Staff Software Engineer, Distributed Systems, Infrastructure Reliability and Developer Productivity",
    email: "max@example.com",
    experience: Array.from({ length: 9 }, (_, i) => ({
      org: `Internationale Gesellschaft für Zusammenarbeit und Entwicklungsdienstleistungen ${i + 1}`,
      role: "Senior Principal Distinguished Engineer and Technical Lead for Platform Infrastructure",
      start: `Jan ${2005 + i * 2}`,
      end: `Dec ${2006 + i * 2}`,
      groups: [{ bullets: [`Reduced deployment time by ${20 + i}% across ${i + 3} continents by rebuilding the release pipeline end to end with zero downtime`, `Grew the platform team from ${i + 2} to ${i + 12} engineers`] }],
    })),
    education: [{ institution: "Rheinisch-Westfälische Technische Hochschule Aachen", degree: "Diplom-Ingenieur Informatik", start: "1999", end: "2004" }],
    skills: [{ items: Array.from({ length: 30 }, (_, i) => `Technology${i}`) }],
  },
  rightToLeft: {
    name: "ليلى حداد",
    headline: "مهندسة برمجيات",
    email: "layla@example.com",
    experience: [{ org: "شركة المستقبل", role: "مهندسة برمجيات", start: "2020", end: "Present", groups: [{ bullets: ["بنيت نظام دفع يخدم 2M+ مستخدم"] }] }],
    education: [{ institution: "الجامعة الأمريكية في بيروت", degree: "بكالوريوس علوم الحاسوب", start: "2014", end: "2018" }],
    skills: [{ items: ["Python", "Go"] }],
  },
};
const CONCEPTS: Concept[] = ["mission", "minimal", "aurora", "brutalist", "scholar", "noir", "blueprint", "editorial", "terminal"];

async function publish(page: Page, name: string, draft: DraftInput, concept: Concept): Promise<string> {
  const parsed = DraftSchema.parse(draft);
  const { resume } = normalize(parsed);
  const genome = generateGenome(resume, { seed: 5, concept });
  const res = await page.request.post("/api/sites", { data: { draft: parsed, genome, slug: `edge-${name.toLowerCase()}-${concept}-${Date.now().toString(36)}` } });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { url: string }).url;
}

test.describe("awkward résumés render cleanly in every template", () => {
  Object.entries(EDGE).forEach(([name, draft], i) => {
    // three templates per case, rotating, so all nine are exercised across the four cases
    const concepts = [0, 1, 2].map((k) => CONCEPTS[(i * 3 + k) % CONCEPTS.length]!);
    for (const concept of concepts) {
      test(`${name} · ${concept}`, async ({ page, isMobile }) => {
        const c = watchConsole(page);
        const url = await publish(page, name, draft, concept);
        await page.goto(`${url}?noboot`);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("#hero-name")).toBeVisible();
        await page.locator("#comms").waitFor({ state: "attached", timeout: 15_000 });
        // walk the page so every chapter renders, then check width and design rules
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 40));
          }
        });
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        const r = (await page.evaluate(audit, isMobile)) as { fails: Array<{ rule: string; where: string; detail: string }> };
        expect(r.fails.map((f) => `${f.rule}: ${f.where} ${f.detail}`)).toEqual([]);
        c.expectClean();
      });
    }
  });
});

test.describe("design rules on every platform page and template", () => {
  const PAGES = ["/", "/templates", "/create", "/u/dhruv-goyal", ...CONCEPTS.map((c) => `/site?demo=${c}&seed=11`)];
  for (const path of PAGES) {
    test(path, async ({ page, isMobile }) => {
      await page.goto(`${path}${path.includes("?") ? "&" : "?"}noboot`);
      await page.waitForLoadState("networkidle");
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
      });
      const r = (await page.evaluate(audit, isMobile)) as { fails: Array<{ rule: string; where: string; detail: string }> };
      expect(r.fails.map((f) => `${f.rule}: ${f.where} ${f.detail}`)).toEqual([]);
    });
  }
});
