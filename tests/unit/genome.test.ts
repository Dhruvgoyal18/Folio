import { describe, expect, it } from "vitest";
import { seedResume } from "@/data/seed";
import { generateGenome, chapterOrder, seedFrom } from "@/genome/generate";
import { auditPalette, generatePalette } from "@/genome/palette";
import { validateGenome } from "@/genome/validate";
import { genomeCss } from "@/genome/apply";
import { GenomeSchema, CONCEPTS } from "@/genome/schema";
import { oklch, contrast } from "@/genome/color";

describe("color", () => {
  it("converts OKLCH to sRGB hex", () => {
    expect(oklch(1, 0, 0)).toBe("#FFFFFF");
    expect(oklch(0, 0, 0)).toBe("#000000");
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
  });
});

describe("palette generator", () => {
  it("every recipe × mode × 72 hues meets WCAG AA", () => {
    for (const recipe of ["paper", "gallery", "phosphor", "studio"] as const)
      for (const mode of ["light", "dark"] as const)
        for (let h = 0; h < 360; h += 5) {
          const issues = auditPalette(generatePalette(recipe, mode, h, (h * 7) % 360));
          expect(issues, `${recipe}/${mode}/${h}`).toEqual([]);
        }
  });
});

describe("genome", () => {
  it("is deterministic for a seed and schema-valid", () => {
    const a = generateGenome(seedResume, { seed: 42 });
    expect(generateGenome(seedResume, { seed: 42 })).toEqual(a);
    expect(GenomeSchema.safeParse(a).success).toBe(true);
  });
  it("different seeds produce visibly different sites", () => {
    const gs = Array.from({ length: 40 }, (_, i) => generateGenome(seedResume, { seed: i * 101 + 3 }));
    const sig = (g: (typeof gs)[number]) => [g.concept, g.fonts, g.hero, g.accentHue, g.sections.telemetry, g.sections.missions, g.order].join("|");
    expect(new Set(gs.map(sig)).size).toBeGreaterThan(30);
    expect(new Set(gs.map((g) => g.concept)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(gs.map((g) => g.fonts)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(gs.map((g) => g.hero)).size).toBeGreaterThanOrEqual(4);
  });
  it("every generated genome passes the publish gate without repairs", () => {
    for (let i = 0; i < 200; i++) {
      for (const concept of CONCEPTS) {
        const v = validateGenome(generateGenome(seedResume, { seed: i, concept }));
        expect(v.ok && v.repaired).toEqual([]);
      }
    }
  });
  it("locks keep fields across remixes", () => {
    const a = generateGenome(seedResume, { seed: 1, concept: "editorial" });
    const b = generateGenome(seedResume, { seed: 999, previous: a, locks: ["concept", "palette", "fonts"] });
    expect(b.concept).toBe(a.concept);
    expect(b.palette).toEqual(a.palette);
    expect(b.fonts).toBe(a.fonts);
    expect(b.seed).not.toBe(a.seed);
  });
  it("copy is filled from resume facts only", () => {
    const g = generateGenome(seedResume, { seed: 5, concept: "mission" });
    expect(JSON.stringify(g.copy)).not.toMatch(/\{\w+\}/);
  });
  it("energy steers motion personality", () => {
    expect(generateGenome(seedResume, { seed: 1, energy: 0 }).motion).toBe("calm");
    expect(generateGenome(seedResume, { seed: 1, energy: 1 }).motion).toBe("cinematic");
  });
  it("validator repairs a hand-broken palette and rejects garbage", () => {
    const g = generateGenome(seedResume, { seed: 7 });
    (g.palette.light as Record<string, string>)["ink-muted"] = "#EEEEEE";
    const v = validateGenome(g);
    expect(v.ok && v.repaired.length).toBe(1);
    expect(validateGenome({ hello: 1 }).ok).toBe(false);
  });
  it("renders CSS variables for both themes and keeps chapter order complete", () => {
    const g = generateGenome(seedResume, { seed: 3 });
    const css = genomeCss(g);
    expect(css).toContain("--c-paper:");
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).not.toMatch(/<\/style/i);
    for (const o of ["story", "work-first", "skills-first"] as const) expect(new Set(chapterOrder({ order: o })).size).toBe(6);
    expect(seedFrom("dhruv-goyal")).toBe(seedFrom("dhruv-goyal"));
  });
});

import { fill } from "@/genome/generate";
describe("copy templates", () => {
  it("never doubles articles around assistant names", () => {
    expect(fill("Ask the {assistant}", { assistant: "The Desk" })).toBe("Ask The Desk");
    expect(fill("Questions? Ask the {assistant}", { assistant: "Concierge" })).toBe("Questions? Ask the Concierge");
  });
});

describe("copy pluralisation", () => {
  it("uses singular nouns for counts of one", () => {
    expect(fill("{n} entries, {n} roles, {n} case files, {n} builds, {n} figures", { n: 1 })).toBe("1 entry, 1 role, 1 case file, 1 build, 1 figure");
    expect(fill("{n} roles", { n: 3 })).toBe("3 roles");
    expect(fill("{n} skills; {n} matches", { n: 1 })).toBe("1 skill; 1 match");
  });
});
